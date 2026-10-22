-- ============================================================================
-- Location privacy: jitter exact coordinates for private residences so the
-- public `events.lat/lng` (used for discovery + map pins) never reveals the
-- real address. Public venues (bar/boliche/espacio_alquilado/playa) keep the
-- exact point, since that's already a public business location.
-- ============================================================================
create or replace function public.jittered_point(
  seed uuid, lat double precision, lng double precision, offset_m double precision default 250
)
returns table (j_lat double precision, j_lng double precision)
language sql
immutable
as $$
  select
    lat + (offset_m * cos(radians((hashtext(seed::text) % 360)))) / 111320.0,
    lng + (offset_m * sin(radians((hashtext(seed::text) % 360))))
      / (111320.0 * cos(radians(lat)))
$$;

create or replace function public.set_event_public_location()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_venue_type text;
  v_lat double precision;
  v_lng double precision;
begin
  select venue_type into v_venue_type from public.events where id = new.event_id;

  if v_venue_type in ('casa', 'quinta') then
    select j_lat, j_lng into v_lat, v_lng
      from public.jittered_point(new.event_id, new.exact_lat, new.exact_lng, 250);
  else
    v_lat := new.exact_lat;
    v_lng := new.exact_lng;
  end if;

  update public.events set lat = v_lat, lng = v_lng, updated_at = now() where id = new.event_id;
  return new;
end;
$$;

create trigger event_locations_private_sync
  after insert or update on public.event_locations_private
  for each row execute function public.set_event_public_location();

-- ============================================================================
-- Creates an event and its private exact location in one transaction, so the
-- un-jittered address is never visible to anyone outside this function.
-- ============================================================================
create or replace function public.create_event_with_location(
  p_category_slug text,
  p_title text,
  p_description text,
  p_venue_type text,
  p_city text,
  p_neighborhood text,
  p_exact_lat double precision,
  p_exact_lng double precision,
  p_exact_address text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_min_age int,
  p_rules text,
  p_capacity int,
  p_access_mode text,
  p_is_free boolean,
  p_price_cents int,
  p_request_deadline timestamptz,
  p_cover_image_url text,
  p_organizer_confirmed_authorization boolean
)
returns public.events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_category_id uuid;
  v_event public.events;
begin
  select id into v_category_id from public.event_categories where slug = p_category_slug and is_active;
  if v_category_id is null then
    raise exception 'UNKNOWN_CATEGORY';
  end if;

  if not p_organizer_confirmed_authorization then
    raise exception 'AUTHORIZATION_NOT_CONFIRMED';
  end if;

  insert into public.events (
    organizer_id, category_id, title, description, venue_type, city, neighborhood,
    lat, lng, starts_at, ends_at, min_age, rules, capacity, access_mode,
    is_free, price_cents, request_deadline, cover_image_url, status,
    organizer_confirmed_authorization
  ) values (
    auth.uid(), v_category_id, p_title, p_description, p_venue_type, p_city, p_neighborhood,
    p_exact_lat, p_exact_lng, p_starts_at, p_ends_at, p_min_age, p_rules, p_capacity, p_access_mode,
    p_is_free, p_price_cents, p_request_deadline, p_cover_image_url, 'published',
    p_organizer_confirmed_authorization
  ) returning * into v_event;

  insert into public.event_locations_private (event_id, exact_address, exact_lat, exact_lng)
  values (v_event.id, p_exact_address, p_exact_lat, p_exact_lng);

  select * into v_event from public.events where id = v_event.id;
  return v_event;
end;
$$;

-- ============================================================================
-- Discovery: radius search backed by the GiST index on events.location.
-- Offset pagination is good enough at Costa Atlántica launch scale; swap for
-- keyset pagination if a single metro area ever needs it.
-- ============================================================================
create or replace function public.events_within_radius(
  origin_lat double precision,
  origin_lng double precision,
  radius_km double precision default 50,
  category_slugs text[] default null,
  free_only boolean default false,
  order_by text default 'distance',
  page int default 0,
  page_size int default 20
)
returns table (
  id uuid,
  title text,
  cover_image_url text,
  organizer_id uuid,
  organizer_username text,
  organizer_display_name text,
  organizer_avatar_url text,
  organizer_is_verified boolean,
  category_slug text,
  neighborhood text,
  city text,
  distance_m double precision,
  starts_at timestamptz,
  ends_at timestamptz,
  price_cents int,
  is_free boolean,
  capacity int,
  confirmed_count bigint,
  status text,
  access_mode text,
  request_deadline timestamptz,
  lat double precision,
  lng double precision
)
language sql
stable
as $$
  with origin as (
    select ST_SetSRID(ST_MakePoint(origin_lng, origin_lat), 4326)::geography as geo
  ),
  base as (
    select
      e.*, c.slug as category_slug_v,
      p.username as organizer_username_v, p.display_name as organizer_display_name_v,
      p.avatar_url as organizer_avatar_url_v, p.is_organizer_verified as organizer_is_verified_v,
      ST_Distance(e.location, origin.geo) as distance_m_v,
      coalesce((
        select count(*) from public.event_attendees ea
        where ea.event_id = e.id and ea.cancelled_at is null
      ), 0) as confirmed_count_v
    from public.events e
    join public.profiles p on p.id = e.organizer_id
    join public.event_categories c on c.id = e.category_id
    cross join origin
    where e.status in ('published', 'full')
      and e.starts_at > now() - interval '3 hours'
      and ST_DWithin(e.location, origin.geo, radius_km * 1000)
      and (category_slugs is null or c.slug = any(category_slugs))
      and (not free_only or e.is_free)
  )
  select
    base.id, base.title, base.cover_image_url, base.organizer_id,
    base.organizer_username_v, base.organizer_display_name_v, base.organizer_avatar_url_v,
    base.organizer_is_verified_v, base.category_slug_v, base.neighborhood, base.city,
    base.distance_m_v, base.starts_at, base.ends_at, base.price_cents, base.is_free,
    base.capacity, base.confirmed_count_v, base.status, base.access_mode,
    base.request_deadline, base.lat, base.lng
  from base
  order by
    (case when order_by = 'distance' then distance_m_v end) asc nulls last,
    (case when order_by = 'date' then starts_at end) asc nulls last,
    (case when order_by = 'popularity' then confirmed_count_v end) desc nulls last,
    id asc
  limit page_size offset page * page_size;
$$;

-- ============================================================================
-- Request / accept / reject — the accept path is the one that must never
-- overbook: it locks the event row with FOR UPDATE so two concurrent accepts
-- on the last spot serialize instead of racing.
-- ============================================================================
create or replace function public.request_event_access(p_event_id uuid, p_message text default null)
returns public.event_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events;
  v_requester uuid := auth.uid();
  v_existing public.event_requests;
  v_row public.event_requests;
  v_confirmed_count int;
begin
  select * into v_event from public.events where id = p_event_id for update;
  if not found or v_event.status not in ('published', 'full') then
    raise exception 'EVENT_NOT_AVAILABLE';
  end if;

  if v_event.organizer_id = v_requester then
    raise exception 'ORGANIZER_CANNOT_REQUEST';
  end if;

  if exists (
    select 1 from public.blocks
    where (blocker_id = v_event.organizer_id and blocked_id = v_requester)
       or (blocker_id = v_requester and blocked_id = v_event.organizer_id)
  ) then
    raise exception 'BLOCKED';
  end if;

  if v_event.request_deadline is not null and now() > v_event.request_deadline then
    raise exception 'DEADLINE_PASSED';
  end if;

  select * into v_existing from public.event_requests
    where event_id = p_event_id and requester_id = v_requester;

  if v_existing.id is not null and v_existing.status in ('pending', 'accepted', 'waitlisted') then
    raise exception 'ALREADY_REQUESTED';
  end if;

  if v_event.access_mode = 'invite_only' and v_existing.id is null then
    raise exception 'INVITE_ONLY';
  end if;

  select count(*) into v_confirmed_count from public.event_attendees
    where event_id = p_event_id and cancelled_at is null;

  -- Open events auto-accept on request as long as there's room; everything
  -- else waits for the organizer to decide via accept_event_request().
  if v_event.access_mode = 'open' and (v_event.capacity is null or v_confirmed_count < v_event.capacity) then
    insert into public.event_requests (event_id, requester_id, message, status, decided_at)
    values (p_event_id, v_requester, p_message, 'accepted', now())
    on conflict (event_id, requester_id)
      do update set status = 'accepted', message = excluded.message, decided_at = now()
    returning * into v_row;

    insert into public.event_attendees (event_id, profile_id, source)
      values (p_event_id, v_requester, 'request')
      on conflict (event_id, profile_id) do nothing;

    perform public.ensure_direct_conversation(p_event_id, v_event.organizer_id, v_requester);
  else
    insert into public.event_requests (event_id, requester_id, message, status)
    values (p_event_id, v_requester, p_message, 'pending')
    on conflict (event_id, requester_id)
      do update set status = 'pending', message = excluded.message, decided_by = null, decided_at = null
    returning * into v_row;

    insert into public.notifications (profile_id, type, title, body, data)
    values (
      v_event.organizer_id, 'new_request', 'Nueva solicitud de acceso',
      'Alguien quiere asistir a "' || v_event.title || '".',
      jsonb_build_object('event_id', p_event_id, 'request_id', v_row.id)
    );
  end if;

  return v_row;
end;
$$;

create or replace function public.accept_event_request(p_request_id uuid)
returns public.event_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.event_requests;
  v_event public.events;
  v_confirmed_count int;
begin
  select * into v_request from public.event_requests where id = p_request_id for update;
  if not found then
    raise exception 'REQUEST_NOT_FOUND';
  end if;

  -- Locking the event row is what makes this safe under concurrency: two
  -- organizers' clients (or two tabs) accepting different requests for the
  -- same event will serialize here instead of both reading stale capacity.
  select * into v_event from public.events where id = v_request.event_id for update;

  if v_event.organizer_id <> auth.uid() then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  if v_request.status not in ('pending', 'waitlisted') then
    raise exception 'REQUEST_NOT_PENDING';
  end if;

  select count(*) into v_confirmed_count from public.event_attendees
    where event_id = v_event.id and cancelled_at is null;

  if v_event.capacity is not null and v_confirmed_count >= v_event.capacity then
    update public.event_requests
      set status = 'waitlisted', decided_by = auth.uid(), decided_at = now()
      where id = p_request_id
      returning * into v_request;
    return v_request;
  end if;

  update public.event_requests
    set status = 'accepted', decided_by = auth.uid(), decided_at = now()
    where id = p_request_id
    returning * into v_request;

  insert into public.event_attendees (event_id, profile_id, source)
    values (v_event.id, v_request.requester_id, 'request')
    on conflict (event_id, profile_id) do nothing;

  select count(*) into v_confirmed_count from public.event_attendees
    where event_id = v_event.id and cancelled_at is null;

  if v_event.capacity is not null and v_confirmed_count >= v_event.capacity then
    update public.events set status = 'full' where id = v_event.id and status = 'published';
  end if;

  perform public.ensure_direct_conversation(v_event.id, v_event.organizer_id, v_request.requester_id);

  insert into public.notifications (profile_id, type, title, body, data)
  values (
    v_request.requester_id, 'request_accepted', '¡Tu solicitud fue aceptada!',
    'Ya podés consultar la información de acceso a "' || v_event.title || '".',
    jsonb_build_object('event_id', v_event.id)
  );

  return v_request;
end;
$$;

create or replace function public.reject_event_request(p_request_id uuid)
returns public.event_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.event_requests;
  v_event public.events;
begin
  select * into v_request from public.event_requests where id = p_request_id for update;
  if not found then
    raise exception 'REQUEST_NOT_FOUND';
  end if;

  select * into v_event from public.events where id = v_request.event_id;
  if v_event.organizer_id <> auth.uid() then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  if v_request.status not in ('pending', 'waitlisted') then
    raise exception 'REQUEST_NOT_PENDING';
  end if;

  update public.event_requests
    set status = 'rejected', decided_by = auth.uid(), decided_at = now()
    where id = p_request_id
    returning * into v_request;

  -- Deliberately discreet: only the requester is told, nothing public.
  insert into public.notifications (profile_id, type, title, body, data)
  values (
    v_request.requester_id, 'request_rejected', 'Hubo novedades sobre tu solicitud',
    'Tu solicitud para "' || v_event.title || '" no fue aceptada esta vez.',
    jsonb_build_object('event_id', v_event.id)
  );

  return v_request;
end;
$$;

create or replace function public.invite_to_event(p_event_id uuid, p_profile_id uuid)
returns public.event_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events;
  v_row public.event_requests;
begin
  select * into v_event from public.events where id = p_event_id;
  if v_event.organizer_id <> auth.uid() then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  insert into public.event_requests (event_id, requester_id, status, decided_by, decided_at)
  values (p_event_id, p_profile_id, 'pending', auth.uid(), now())
  on conflict (event_id, requester_id) do update set status = 'pending'
  returning * into v_row;

  insert into public.notifications (profile_id, type, title, body, data)
  values (p_profile_id, 'event_invite', 'Te invitaron a una fiesta', v_event.title,
    jsonb_build_object('event_id', p_event_id));

  return v_row;
end;
$$;

create or replace function public.cancel_attendance(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid := auth.uid();
begin
  update public.event_attendees
    set cancelled_at = now()
    where event_id = p_event_id and profile_id = v_profile_id and cancelled_at is null;

  update public.event_requests
    set status = 'cancelled'
    where event_id = p_event_id and requester_id = v_profile_id and status in ('pending', 'accepted', 'waitlisted');

  update public.events set status = 'published' where id = p_event_id and status = 'full';

  insert into public.notifications (profile_id, type, title, body, data)
  select organizer_id, 'capacity_changed', 'Un asistente canceló su lugar',
    'Se liberó una plaza en "' || title || '".', jsonb_build_object('event_id', id)
  from public.events where id = p_event_id;
end;
$$;

create or replace function public.ensure_direct_conversation(p_event_id uuid, p_organizer_id uuid, p_requester_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation_id uuid;
begin
  select c.id into v_conversation_id
  from public.conversations c
  join public.conversation_members m1 on m1.conversation_id = c.id and m1.profile_id = p_organizer_id
  join public.conversation_members m2 on m2.conversation_id = c.id and m2.profile_id = p_requester_id
  where c.event_id = p_event_id and c.is_group = false
  limit 1;

  if v_conversation_id is not null then
    return v_conversation_id;
  end if;

  insert into public.conversations (event_id, is_group) values (p_event_id, false)
    returning id into v_conversation_id;

  insert into public.conversation_members (conversation_id, profile_id)
  values (v_conversation_id, p_organizer_id), (v_conversation_id, p_requester_id);

  return v_conversation_id;
end;
$$;

create or replace function public.ensure_group_conversation(p_event_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events;
  v_conversation_id uuid;
begin
  select * into v_event from public.events where id = p_event_id;
  if v_event.organizer_id <> auth.uid() then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  select id into v_conversation_id from public.conversations
    where event_id = p_event_id and is_group = true limit 1;

  if v_conversation_id is not null then
    return v_conversation_id;
  end if;

  insert into public.conversations (event_id, is_group, title)
    values (p_event_id, true, v_event.title)
    returning id into v_conversation_id;

  insert into public.conversation_members (conversation_id, profile_id, is_admin)
  select v_conversation_id, profile_id, (profile_id = v_event.organizer_id)
  from public.event_attendees where event_id = p_event_id and cancelled_at is null
  union
  select v_conversation_id, v_event.organizer_id, true;

  return v_conversation_id;
end;
$$;

alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.conversation_members;
