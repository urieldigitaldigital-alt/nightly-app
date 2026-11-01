-- Events never transitioned to 'finished' once they ended — the enum value
-- existed (0003_events.sql) but nothing ever set it, so a short event could
-- keep showing up in the discover feed/map for up to 3 hours after it
-- started regardless of how short it actually was, since the only time
-- filter in events_within_radius was on starts_at.
--
-- Two layers, same as the existing DNI-photo purge pattern:
--  1. A cron job that marks events 'finished' shortly after they end, so a
--     straight `select * from events` elsewhere in the app also reflects
--     reality.
--  2. The feed RPC itself also excludes events whose effective end time has
--     passed, so there's no up-to-10-minute window (the cron's cadence)
--     where an ended event is still technically 'published' and visible.
-- Events with no ends_at get a 6-hour default duration — long enough for a
-- typical previa/fiesta, short enough that a forgotten end date doesn't
-- leave an event visible indefinitely.

create or replace function public.expire_finished_events()
returns void
language sql
security definer
set search_path = public
as $$
  update public.events
  set status = 'finished'
  where status in ('published', 'full')
    and coalesce(ends_at, starts_at + interval '6 hours') <= now();
$$;

select cron.schedule('expire-finished-events', '*/10 * * * *', 'select public.expire_finished_events();');

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
      and coalesce(e.ends_at, e.starts_at + interval '6 hours') > now()
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
