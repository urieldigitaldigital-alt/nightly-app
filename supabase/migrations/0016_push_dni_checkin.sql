-- ============================================================================
-- Push notification delivery, "nearby event" alerts, DNI-verified requests,
-- and door check-in codes.
--
-- Push delivery itself (actually calling Expo's push API) lives in the new
-- supabase/functions/send-push Edge Function, wired via a Database Webhook
-- on notifications INSERT (configured in the dashboard, not expressible in
-- SQL) — everything here is schema + the server-side logic that feeds it.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Private per-user location, used ONLY to match "nearby event" notifications.
-- Deliberately NOT a column on public.profiles: profiles has a public
-- `select using (deleted_at is null)` policy with no column-level
-- restriction (0002_profiles.sql), so a raw lat/lng column there would leak
-- every user's last-known location to every other user — directly
-- contradicting the app's own "tu ubicación nunca se comparte" promise
-- (app/settings/privacy.tsx). Mirrors the event_locations_private pattern:
-- sensitive location data lives in its own table, readable only by its
-- owner (or a SECURITY DEFINER function, same as events_within_radius does
-- for event discovery).
-- ---------------------------------------------------------------------------
create table public.user_locations_private (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  lat double precision,
  lng double precision,
  geo geography generated always as (
    case when lat is null or lng is null then null
    else ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography end
  ) stored,
  search_radius_km double precision not null default 50,
  updated_at timestamptz not null default now()
);

alter table public.user_locations_private enable row level security;

create policy "users manage only their own location row"
  on public.user_locations_private for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- Only write path for the table above — never a raw client UPDATE. Called
-- once after the client successfully resolves a location fix (not on a
-- continuous watch), so this is an opportunistic "last known", not live
-- tracking.
create or replace function public.upsert_my_location(p_lat double precision, p_lng double precision)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_locations_private (profile_id, lat, lng, updated_at)
  values (auth.uid(), p_lat, p_lng, now())
  on conflict (profile_id) do update set lat = excluded.lat, lng = excluded.lng, updated_at = now();
end;
$$;

-- Fan-out: inserts a notification for every user whose last-known location
-- is within their own chosen radius of a newly published event. Called from
-- create_event_with_location below, only for published events.
create or replace function public.notify_nearby_users(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event record;
begin
  select e.id, e.title, e.organizer_id, e.location
    into v_event
    from public.events e
    where e.id = p_event_id;

  insert into public.notifications (profile_id, type, title, body, data)
  select
    ulp.profile_id, 'event_nearby', 'Nueva fiesta cerca tuyo',
    v_event.title, jsonb_build_object('event_id', v_event.id)
  from public.user_locations_private ulp
  where ulp.profile_id <> v_event.organizer_id
    and ulp.geo is not null
    and ST_DWithin(ulp.geo, v_event.location, ulp.search_radius_km * 1000);
end;
$$;

-- Re-create create_event_with_location with one addition: fan out a
-- "nearby" notification right after the event (and its public, jittered
-- location) are set.
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

  if v_event.status = 'published' then
    perform public.notify_nearby_users(v_event.id);
  end if;

  return v_event;
end;
$$;

-- ---------------------------------------------------------------------------
-- New notification type: event_nearby.
-- ---------------------------------------------------------------------------
-- Looked up dynamically rather than assumed, since Postgres's auto-generated
-- name for an inline column CHECK isn't guaranteed across versions.
do $$
declare
  v_constraint_name text;
begin
  select conname into v_constraint_name
    from pg_constraint
    where conrelid = 'public.notifications'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%type = ANY%';

  if v_constraint_name is not null then
    execute format('alter table public.notifications drop constraint %I', v_constraint_name);
  end if;
end $$;

alter table public.notifications add constraint notifications_type_check check (type in (
  'new_request', 'request_accepted', 'request_rejected', 'new_message',
  'event_invite', 'event_time_changed', 'event_location_changed',
  'event_cancelled', 'event_upcoming', 'capacity_changed', 'event_nearby'
));

alter table public.profiles alter column notification_prefs set default '{
  "new_request": true,
  "request_accepted": true,
  "request_rejected": true,
  "new_message": true,
  "event_invite": true,
  "event_time_changed": true,
  "event_location_changed": true,
  "event_cancelled": true,
  "event_upcoming": true,
  "capacity_changed": true,
  "event_nearby": true
}'::jsonb;

-- ---------------------------------------------------------------------------
-- DNI photo: private storage bucket + event_requests column.
-- First private bucket in the project — no public SELECT policy at all,
-- since a storage path-based policy can't express "organizer of the event
-- this particular upload belongs to" (the path only encodes the requester's
-- id, not the event). Reads only ever go through the send-dni-signed-url
-- Edge Function, which checks event_requests' own RLS (requester or
-- organizer) before asking the Storage API (with the service role) for a
-- short-lived signed URL.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('dni-photos', 'dni-photos', false)
on conflict (id) do nothing;

create policy "users upload only to their own dni-photos folder"
  on storage.objects for insert
  with check (
    bucket_id = 'dni-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

alter table public.event_requests add column dni_photo_path text;

-- Entry codes + door check-in columns, added here (ahead of the functions
-- below that reference them) rather than down with the rest of the
-- check-in logic, so every statement in this file reads top-to-bottom
-- without forward references.
alter table public.event_attendees
  add column entry_code text unique,
  add column checked_in_at timestamptz,
  add column checked_in_by uuid references public.profiles (id);

-- Re-create request_event_access with two additions: a required DNI photo
-- path (enforced server-side, not just in the client UI) and generating an
-- entry code for the 'open' auto-accept branch (the organizer-review branch
-- gets its code from accept_event_request below instead).
create or replace function public.generate_entry_code()
returns text
language sql
as $$
  select upper(encode(gen_random_bytes(4), 'hex'));
$$;

create or replace function public.request_event_access(
  p_event_id uuid,
  p_message text default null,
  p_dni_photo_path text default null
)
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
  if p_dni_photo_path is null or p_dni_photo_path = '' then
    raise exception 'DNI_REQUIRED';
  end if;

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
    insert into public.event_requests (event_id, requester_id, message, status, decided_at, dni_photo_path)
    values (p_event_id, v_requester, p_message, 'accepted', now(), p_dni_photo_path)
    on conflict (event_id, requester_id)
      do update set status = 'accepted', message = excluded.message, decided_at = now(),
        dni_photo_path = excluded.dni_photo_path
    returning * into v_row;

    insert into public.event_attendees (event_id, profile_id, source, entry_code)
      values (p_event_id, v_requester, 'request', public.generate_entry_code())
      on conflict (event_id, profile_id) do nothing;

    perform public.ensure_direct_conversation(p_event_id, v_event.organizer_id, v_requester);
  else
    insert into public.event_requests (event_id, requester_id, message, status, dni_photo_path)
    values (p_event_id, v_requester, p_message, 'pending', p_dni_photo_path)
    on conflict (event_id, requester_id)
      do update set status = 'pending', message = excluded.message, decided_by = null, decided_at = null,
        dni_photo_path = excluded.dni_photo_path
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

-- Auto-delete DNI photos some days after the event they belong to has
-- ended — the organizer only ever needed them to decide on the request, not
-- indefinitely. Runs daily via pg_cron.
create extension if not exists pg_cron;

create or replace function public.purge_expired_dni_photos()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select er.id, er.dni_photo_path
    from public.event_requests er
    join public.events e on e.id = er.event_id
    where er.dni_photo_path is not null
      and e.ends_at < now() - interval '5 days'
  loop
    delete from storage.objects where bucket_id = 'dni-photos' and name = r.dni_photo_path;
    update public.event_requests set dni_photo_path = null where id = r.id;
  end loop;
end;
$$;

select cron.schedule('purge-expired-dni-photos', '0 4 * * *', 'select public.purge_expired_dni_photos();');

-- ---------------------------------------------------------------------------
-- Door check-in.
-- ---------------------------------------------------------------------------
-- Re-create accept_event_request to also generate an entry code when an
-- attendee row is created (the organizer-review acceptance path — the
-- 'open' auto-accept path already generates one above).
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

  insert into public.event_attendees (event_id, profile_id, source, entry_code)
    values (v_event.id, v_request.requester_id, 'request', public.generate_entry_code())
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

-- Organizer-only lookup used by the door check-in screen.
create or replace function public.check_in_attendee(p_event_id uuid, p_code text)
returns public.event_attendees
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attendee public.event_attendees;
begin
  if not public.is_event_organizer(p_event_id) then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  select * into v_attendee from public.event_attendees
    where event_id = p_event_id and entry_code = upper(p_code)
    for update;

  if not found then
    raise exception 'INVALID_CODE';
  end if;

  if v_attendee.cancelled_at is not null then
    raise exception 'ATTENDANCE_CANCELLED';
  end if;

  if v_attendee.checked_in_at is not null then
    raise exception 'ALREADY_CHECKED_IN';
  end if;

  update public.event_attendees
    set checked_in_at = now(), checked_in_by = auth.uid()
    where id = v_attendee.id
    returning * into v_attendee;

  return v_attendee;
end;
$$;
