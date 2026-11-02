-- Live location sharing during active navigation: a guest who was accepted
-- into an event can optionally broadcast their position while navigating
-- there, and the event's organizer can see them approaching. Neither side
-- can see anyone else's location — only the organizer of a given event can
-- read a guest's row for that specific event, and only while the guest's
-- request is 'accepted'. The guest clears their own row on arrival/exit
-- (see services/liveLocation.ts); the cron below is just a safety net for
-- a crashed app leaving a stale row behind.

create table public.live_locations (
  event_id uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  heading double precision,
  updated_at timestamptz not null default now(),
  primary key (event_id, profile_id)
);

alter table public.live_locations enable row level security;

create policy "accepted guests can upsert their own live location"
  on public.live_locations for insert
  with check (
    profile_id = auth.uid()
    and exists (
      select 1 from public.event_requests er
      where er.event_id = live_locations.event_id
        and er.requester_id = auth.uid()
        and er.status = 'accepted'
    )
  );

create policy "accepted guests can keep updating their own live location"
  on public.live_locations for update
  using (profile_id = auth.uid())
  with check (
    profile_id = auth.uid()
    and exists (
      select 1 from public.event_requests er
      where er.event_id = live_locations.event_id
        and er.requester_id = auth.uid()
        and er.status = 'accepted'
    )
  );

create policy "a guest can stop sharing by deleting their own row"
  on public.live_locations for delete
  using (profile_id = auth.uid());

create policy "the guest and that event's organizer can read a live location"
  on public.live_locations for select
  using (
    profile_id = auth.uid()
    or exists (
      select 1 from public.events e
      where e.id = live_locations.event_id and e.organizer_id = auth.uid()
    )
  );

alter publication supabase_realtime add table public.live_locations;

-- Safety net only — the client clears its own row on arrival/cancel/exit.
-- This just catches rows orphaned by a crash or a force-quit mid-navigation.
create or replace function public.purge_stale_live_locations()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.live_locations where updated_at < now() - interval '30 minutes';
$$;

select cron.schedule('purge-stale-live-locations', '*/30 * * * *', 'select public.purge_stale_live_locations();');
