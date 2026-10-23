-- generate_entry_code() (0016_push_dni_checkin.sql) called gen_random_bytes()
-- unqualified. On this project pgcrypto's functions live in the `extensions`
-- schema, not `public` — and every function that calls generate_entry_code()
-- (request_event_access, accept_event_request) runs with
-- `set search_path = public`, which doesn't include `extensions`. Every
-- accept/open-join attempt since 0016 failed with
-- "function gen_random_bytes(integer) does not exist" (confirmed in the
-- Postgres logs). Schema-qualifying the call fixes it regardless of search_path.
create or replace function public.generate_entry_code()
returns text
language sql
as $$
  select upper(encode(extensions.gen_random_bytes(4), 'hex'));
$$;
