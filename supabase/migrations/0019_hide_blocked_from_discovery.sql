-- Blocking already prevents messaging and event-request access (see the
-- messages insert policy in 0010_rls.sql and request_event_access() in
-- 0016_push_dni_checkin.sql), but it never hid the blocked party's profile
-- or published events from the blocker's feed/map/search — a blocked user
-- could still freely browse the person who blocked them, and vice versa,
-- which isn't what either side of a block reasonably expects.

drop policy if exists "events are readable when published or by their organizer" on public.events;
create policy "events are readable when published or by their organizer"
  on public.events for select
  using (
    (
      status in ('published', 'full', 'finished')
      and not exists (
        select 1 from public.blocks b
        where (b.blocker_id = auth.uid() and b.blocked_id = organizer_id)
           or (b.blocker_id = organizer_id and b.blocked_id = auth.uid())
      )
    )
    or organizer_id = auth.uid()
    or public.is_admin()
  );

drop policy if exists "profiles are publicly readable (non-sensitive columns only)" on public.profiles;
create policy "profiles are publicly readable (non-sensitive columns only)"
  on public.profiles for select
  using (
    deleted_at is null
    and (
      auth.uid() = id
      or not exists (
        select 1 from public.blocks b
        where (b.blocker_id = auth.uid() and b.blocked_id = id)
           or (b.blocker_id = id and b.blocked_id = auth.uid())
      )
    )
  );
