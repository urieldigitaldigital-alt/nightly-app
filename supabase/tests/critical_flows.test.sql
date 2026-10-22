-- pgTAP tests for the flows that must never regress: capacity enforcement,
-- organizer-only request decisions, and exact-address privacy.
--
-- Run with the Supabase CLI against a local Docker Postgres:
--   supabase start
--   supabase test db
begin;
select plan(10);

create extension if not exists pgtap;

-- ---------------------------------------------------------------- fixtures --
-- handle_new_user() (0002_profiles.sql) auto-creates the public.profiles row
-- from auth.users' raw_user_meta_data — inserting into both tables separately
-- double-creates the profile and trips the username unique constraint.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000001', 'organizer@test.nightly',
    '{"username":"organizer","display_name":"Organizer","birthdate":"1990-01-01"}'),
  ('00000000-0000-0000-0000-000000000002', 'guest1@test.nightly',
    '{"username":"guest1","display_name":"Guest One","birthdate":"1995-01-01"}'),
  ('00000000-0000-0000-0000-000000000003', 'guest2@test.nightly',
    '{"username":"guest2","display_name":"Guest Two","birthdate":"1996-01-01"}'),
  ('00000000-0000-0000-0000-000000000004', 'outsider@test.nightly',
    '{"username":"outsider","display_name":"Outsider","birthdate":"1997-01-01"}');

-- Act as the organizer to create an event with capacity for exactly 1 guest.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

select (create_event_with_location(
  'previa', 'Previa de prueba', 'Descripcion de prueba', 'casa', 'Pinamar', 'Centro',
  -37.0968, -56.8611, 'Calle Falsa 123',
  now() + interval '1 day', null, null, null, 1, 'request',
  true, null, null, null, true
)).id as event_id \gset

-- -------------------------------------------------- capacity enforcement --
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';
select (request_event_access(:'event_id')).id as req1_id \gset

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';
select (request_event_access(:'event_id')).id as req2_id \gset

-- Organizer accepts guest1: should succeed and fill the only spot.
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

select is(
  (select status from public.event_requests where id = :'req1_id'::uuid),
  'pending',
  'guest1 request starts pending'
);

select accept_event_request(:'req1_id');

select is(
  (select status from public.event_requests where id = :'req1_id'::uuid),
  'accepted',
  'guest1 request is accepted'
);

select is(
  (select count(*)::int from public.event_attendees where event_id = :'event_id'::uuid and cancelled_at is null),
  1,
  'exactly one confirmed attendee after accepting guest1'
);

-- Organizer accepts guest2: capacity is full, so this must waitlist, never overbook.
select accept_event_request(:'req2_id');

select is(
  (select status from public.event_requests where id = :'req2_id'::uuid),
  'waitlisted',
  'guest2 is waitlisted instead of overbooking the event'
);

select is(
  (select count(*)::int from public.event_attendees where event_id = :'event_id'::uuid and cancelled_at is null),
  1,
  'confirmed attendee count never exceeds capacity'
);

-- --------------------------------------------- organizer-only authorization --
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000004","role":"authenticated"}';

select throws_ok(
  format('select accept_event_request(%L)', :'req2_id'),
  'NOT_AUTHORIZED',
  'a non-organizer cannot accept a request for someone else''s event'
);

-- --------------------------------------------------- exact address privacy --
-- guest2 was never accepted, so the exact address must stay invisible.
select is(
  (select count(*)::int from public.event_locations_private where event_id = :'event_id'::uuid),
  0,
  'guest2 (not accepted) cannot read the exact address'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';

-- guest1 was accepted, so the exact address must now be visible.
select is(
  (select exact_address from public.event_locations_private where event_id = :'event_id'::uuid),
  'Calle Falsa 123',
  'guest1 (accepted) can read the exact address'
);

-- ------------------------------------------- conversation_members RLS --
-- Regression test: a naive policy on conversation_members that subqueries
-- conversation_members from within itself causes Postgres error 42P17
-- ("infinite recursion detected in policy") — see is_conversation_member()
-- in 0010_rls.sql, which exists specifically to avoid this. Accepting
-- guest1's request (above) already created a 1:1 conversation between the
-- organizer and guest1 via ensure_direct_conversation().
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

select lives_ok(
  format(
    $$ select count(*) from public.conversation_members
       where conversation_id in (
         select id from public.conversations where event_id = %L::uuid
       ) $$,
    :'event_id'
  ),
  'organizer can query conversation_members without triggering RLS recursion'
);

select is(
  (
    select count(*)::int from public.conversation_members cm
    join public.conversations c on c.id = cm.conversation_id
    where c.event_id = :'event_id'::uuid
  ),
  2,
  'the auto-created 1:1 conversation has exactly the organizer and guest1 as members'
);

select * from finish();
rollback;
