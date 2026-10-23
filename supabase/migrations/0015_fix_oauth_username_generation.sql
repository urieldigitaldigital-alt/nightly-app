-- handle_new_user() (0014_oauth_signup.sql) generates a fallback username
-- for OAuth signups as `<email local-part>_<6 hex chars>`, with no cap on
-- length. profiles.username_format (0002_profiles.sql) requires 3-24 chars,
-- so any Google account whose local-part survives stripping at more than 17
-- characters overflows that bound and the insert fails with
-- "new row for relation \"profiles\" violates check constraint
-- \"username_format\"" — surfaced to the client as the opaque
-- "Database error saving new user", silently blocking that Google sign-in.
--
-- Also fixes a case-order bug: the old regexp stripped characters as
-- "invalid" BEFORE lowercasing, so any uppercase letter in the local-part
-- (e.g. "Uriel.Gayozo@gmail.com") was deleted instead of lowercased.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_has_birthdate boolean := (new.raw_user_meta_data ->> 'birthdate') is not null;
  v_username text;
  v_local_part text;
begin
  v_local_part := lower(regexp_replace(coalesce(split_part(new.email, '@', 1), 'user'), '[^a-z0-9_.]', '', 'g'));

  v_username := coalesce(
    nullif(new.raw_user_meta_data ->> 'username', ''),
    left(coalesce(nullif(v_local_part, ''), 'user'), 17) || '_' || substr(replace(new.id::text, '-', ''), 1, 6)
  );

  insert into public.profiles (id, username, display_name, avatar_url, birthdate, birthdate_confirmed)
  values (
    new.id,
    v_username,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      'Nuevo usuario'
    ),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'),
    coalesce((new.raw_user_meta_data ->> 'birthdate')::date, current_date - interval '18 years'),
    v_has_birthdate
  );
  return new;
end;
$$;
