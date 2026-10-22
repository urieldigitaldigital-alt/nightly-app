create table public.event_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  sort_order int not null default 0,
  is_active boolean not null default true
);

alter table public.event_categories enable row level security;

create policy "categories are publicly readable"
  on public.event_categories for select
  using (is_active);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.profiles (id) on delete cascade,
  category_id uuid not null references public.event_categories (id),
  title text not null,
  description text not null,
  venue_type text not null check (venue_type in ('quinta', 'casa', 'bar', 'boliche', 'playa', 'espacio_alquilado', 'otro')),
  city text not null,
  neighborhood text,
  -- Public/approximate coordinates only. Jittered server-side for private venue
  -- types by set_event_public_location() in 0009_functions.sql — never trust the
  -- client to have fuzzed these, since a malicious client could just not fuzz.
  lat double precision not null,
  lng double precision not null,
  location geography(point, 4326) generated always as (
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
  ) stored,
  starts_at timestamptz not null,
  ends_at timestamptz,
  min_age int check (min_age is null or min_age >= 18),
  rules text,
  capacity int check (capacity is null or capacity >= 0),
  access_mode text not null default 'request' check (access_mode in ('open', 'request', 'invite_only')),
  is_free boolean not null default true,
  price_cents int check (price_cents is null or price_cents >= 0),
  request_deadline timestamptz,
  status text not null default 'draft'
    check (status in ('draft', 'pending_review', 'published', 'full', 'cancelled', 'finished')),
  cover_image_url text,
  organizer_confirmed_authorization boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ends_after_starts check (ends_at is null or ends_at > starts_at),
  constraint price_requires_paid check (is_free or price_cents is not null),
  constraint must_confirm_authorization_to_publish
    check (status = 'draft' or organizer_confirmed_authorization)
);

create index events_location_idx on public.events using gist (location);
create index events_organizer_idx on public.events (organizer_id);
create index events_status_starts_idx on public.events (status, starts_at);
create index events_category_idx on public.events (category_id);

create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

create table public.event_images (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index event_images_event_idx on public.event_images (event_id);

-- Exact address lives in its own table so it can be protected independently
-- from the public event listing. Only the organizer and accepted attendees
-- can read it (see policies in 0010_rls.sql).
create table public.event_locations_private (
  event_id uuid primary key references public.events (id) on delete cascade,
  exact_address text not null,
  exact_lat double precision not null,
  exact_lng double precision not null,
  access_notes text,
  updated_at timestamptz not null default now()
);

alter table public.events enable row level security;
alter table public.event_images enable row level security;
alter table public.event_locations_private enable row level security;
