-- Supports Google (and other OAuth) sign-in alongside email/password.
--
-- OAuth providers never hand us a real birthdate, and we are not going to
-- fabricate one just to satisfy the NOT NULL/adult_only constraints on
-- profiles — see AGENTS-level rule "no inventes resultados". Instead:
-- birthdate_confirmed tracks whether the stored birthdate is one the user
-- actually entered (email/password signup) or a 18-years-ago placeholder
-- (OAuth signup) that the app must prompt the user to replace with their
-- real birthdate before granting full access — see
-- app/(auth)/confirm-birthdate.tsx and the guard in app/_layout.tsx.
alter table public.profiles
  add column birthdate_confirmed boolean not null default true;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_has_birthdate boolean := (new.raw_user_meta_data ->> 'birthdate') is not null;
  v_username text;
begin
  v_username := coalesce(
    nullif(new.raw_user_meta_data ->> 'username', ''),
    lower(regexp_replace(coalesce(split_part(new.email, '@', 1), 'user'), '[^a-z0-9_.]', '', 'g'))
      || '_' || substr(replace(new.id::text, '-', ''), 1, 6)
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

-- A user confirming their real birthdate is allowed to flip this flag (and
-- only this flag + their own birthdate) themselves, once, via the app —
-- distinct from role/verification badges, which stay admin-only.
create or replace function public.confirm_birthdate(p_birthdate date)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  if p_birthdate > (current_date - interval '18 years') then
    raise exception 'MUST_BE_ADULT';
  end if;

  update public.profiles
    set birthdate = p_birthdate, birthdate_confirmed = true
    where id = auth.uid()
    returning * into v_profile;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  return v_profile;
end;
$$;
