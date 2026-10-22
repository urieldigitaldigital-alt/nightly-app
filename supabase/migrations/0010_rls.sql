-- ============================================================================
-- Row Level Security policies. Nothing here trusts the client: every rule
-- that matters (capacity, address privacy, chat membership, admin role) is
-- enforced by Postgres itself, not by hiding a button in the app.
-- ============================================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_event_organizer(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.events where id = p_event_id and organizer_id = auth.uid());
$$;

create or replace function public.is_confirmed_attendee(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.event_attendees
    where event_id = p_event_id and profile_id = auth.uid() and cancelled_at is null
  );
$$;

-- SECURITY DEFINER so the lookup bypasses RLS instead of re-triggering the
-- conversation_members policy that calls this function — a plain subquery
-- against conversation_members from within its own policy causes Postgres to
-- report "infinite recursion detected in policy for relation
-- conversation_members" (error 42P17).
create or replace function public.is_conversation_member(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = p_conversation_id and profile_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------- events --
create policy "events are readable when published or by their organizer"
  on public.events for select
  using (status in ('published', 'full', 'finished') or organizer_id = auth.uid() or public.is_admin());

-- No insert policy: rows are only created via create_event_with_location(),
-- which is SECURITY DEFINER and validates authorization-confirmation first.
create policy "organizers can update their own events"
  on public.events for update
  using (organizer_id = auth.uid())
  with check (organizer_id = auth.uid());

-- ----------------------------------------------------------- event_images --
create policy "event images follow the parent event's visibility"
  on public.event_images for select
  using (
    exists (
      select 1 from public.events e
      where e.id = event_images.event_id
        and (e.status in ('published', 'full', 'finished') or e.organizer_id = auth.uid())
    )
  );

create policy "organizers manage their own event images"
  on public.event_images for all
  using (public.is_event_organizer(event_id))
  with check (public.is_event_organizer(event_id));

-- ------------------------------------------------- event_locations_private --
create policy "exact address visible to organizer and accepted attendees"
  on public.event_locations_private for select
  using (
    public.is_event_organizer(event_id)
    or public.is_confirmed_attendee(event_id)
    or exists (
      select 1 from public.event_requests r
      where r.event_id = event_locations_private.event_id
        and r.requester_id = auth.uid()
        and r.status = 'accepted'
    )
  );

create policy "organizers can update the exact address"
  on public.event_locations_private for update
  using (public.is_event_organizer(event_id))
  with check (public.is_event_organizer(event_id));

-- --------------------------------------------------------- event_requests --
create policy "requesters and organizers can read requests"
  on public.event_requests for select
  using (requester_id = auth.uid() or public.is_event_organizer(event_id));

-- No insert/update policies: all writes go through request_event_access(),
-- accept_event_request(), reject_event_request(), invite_to_event() and
-- cancel_attendance(), which run with SECURITY DEFINER and enforce capacity,
-- blocking and deadline rules atomically.

-- -------------------------------------------------------- event_attendees --
create policy "organizer and the attendee themselves can read attendance"
  on public.event_attendees for select
  using (profile_id = auth.uid() or public.is_event_organizer(event_id));

-- ---------------------------------------------------------- conversations --
create policy "members can read their conversations"
  on public.conversations for select
  using (public.is_conversation_member(id));

-- ---------------------------------------------------- conversation_members --
create policy "members can see co-members of their conversations"
  on public.conversation_members for select
  using (
    profile_id = auth.uid()
    or public.is_conversation_member(conversation_id)
  );

create policy "members can update their own membership row"
  on public.conversation_members for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- -------------------------------------------------------------- messages --
create policy "only conversation members can read messages"
  on public.messages for select
  using (public.is_conversation_member(conversation_id));

create policy "only conversation members can send messages, as themselves"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversation_members m
      where m.conversation_id = messages.conversation_id
        and m.profile_id = auth.uid()
        and m.left_at is null
    )
    and not exists (
      -- can't message someone who blocked you (or whom you blocked) in a 1:1 chat
      select 1 from public.conversations c
      join public.conversation_members other on other.conversation_id = c.id and other.profile_id <> auth.uid()
      join public.blocks b on
        (b.blocker_id = other.profile_id and b.blocked_id = auth.uid())
        or (b.blocker_id = auth.uid() and b.blocked_id = other.profile_id)
      where c.id = messages.conversation_id and c.is_group = false
    )
  );

-- ---------------------------------------------------------------- follows --
create policy "follows are publicly readable"
  on public.follows for select
  using (true);

create policy "users can follow as themselves"
  on public.follows for insert
  with check (follower_id = auth.uid());

create policy "users can unfollow as themselves"
  on public.follows for delete
  using (follower_id = auth.uid());

-- ----------------------------------------------------------- saved_events --
create policy "saved events are private to each user"
  on public.saved_events for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- ----------------------------------------------------------------- blocks --
create policy "only the blocker can see or manage their blocks"
  on public.blocks for all
  using (blocker_id = auth.uid())
  with check (blocker_id = auth.uid());

-- ----------------------------------------------------------- notifications --
create policy "users read their own notifications"
  on public.notifications for select
  using (profile_id = auth.uid());

create policy "users can mark their own notifications as read"
  on public.notifications for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- ---------------------------------------------------------------- reports --
create policy "reporters read their own reports, admins read all"
  on public.reports for select
  using (reporter_id = auth.uid() or public.is_admin());

create policy "any authenticated user can file a report as themselves"
  on public.reports for insert
  with check (reporter_id = auth.uid());

create policy "only admins can update report status"
  on public.reports for update
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------- reviews --
create policy "reviews are publicly readable"
  on public.reviews for select
  using (true);

create policy "only confirmed attendees of a finished event can review it"
  on public.reviews for insert
  with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from public.event_attendees ea
      join public.events e on e.id = ea.event_id
      where ea.event_id = reviews.event_id
        and ea.profile_id = auth.uid()
        and ea.cancelled_at is null
        and e.status = 'finished'
    )
  );

create policy "reviewers manage their own review"
  on public.reviews for update
  using (reviewer_id = auth.uid())
  with check (reviewer_id = auth.uid());

create policy "reviewers can delete their own review"
  on public.reviews for delete
  using (reviewer_id = auth.uid());

-- ------------------------------------------------------------ device_tokens --
create policy "device tokens are private to each user"
  on public.device_tokens for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- -------------------------------------------------------- admin_audit_logs --
create policy "only admins can read the audit log"
  on public.admin_audit_logs for select
  using (public.is_admin());

create policy "only admins can write to the audit log"
  on public.admin_audit_logs for insert
  with check (public.is_admin() and admin_id = auth.uid());
