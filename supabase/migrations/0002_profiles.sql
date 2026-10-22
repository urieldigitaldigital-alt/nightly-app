-- Shared helper reused by every table below that has an updated_at column.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Profiles: one row per auth.users row, created automatically on signup.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  display_name text not null,
  avatar_url text,
  bio text,
  city text,
  music_interests text[] not null default '{}',
  birthdate date not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  is_verified boolean not null default false,
  is_organizer_verified boolean not null default false,
  onboarding_completed_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-z0-9_.]{3,24}$'),
  constraint adult_only check (birthdate <= (current_date - interval '18 years'))
);

create index profiles_username_idx on public.profiles (username);

-- Privileged columns (role, verification badges) can only change via service_role
-- (admin tools / Edge Functions), never from the authenticated user's own update.
create or replace function public.prevent_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    new.role := old.role;
    new.is_verified := old.is_verified;
    new.is_organizer_verified := old.is_organizer_verified;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_prevent_privilege_escalation
  before update on public.profiles
  for each row execute function public.prevent_privilege_escalation();

-- Auto-create a profile row right after a user signs up in auth.users.
-- Expects the client to pass display_name / birthdate / username via
-- supabase.auth.signUp({ options: { data: { ... } } }).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, birthdate)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data ->> 'display_name', 'Nuevo usuario'),
    coalesce((new.raw_user_meta_data ->> 'birthdate')::date, current_date - interval '18 years')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy "profiles are publicly readable (non-sensitive columns only)"
  on public.profiles for select
  using (deleted_at is null);

create policy "users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "users can soft-delete / manage only their own row via update"
  on public.profiles for delete
  using (false); -- deletion goes through the request-account-deletion Edge Function
