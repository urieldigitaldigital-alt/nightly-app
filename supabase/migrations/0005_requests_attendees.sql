create table public.event_requests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'cancelled', 'waitlisted')),
  message text,
  decided_by uuid references public.profiles (id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, requester_id)
);

create index event_requests_event_idx on public.event_requests (event_id, status);
create index event_requests_requester_idx on public.event_requests (requester_id);

create trigger event_requests_set_updated_at
  before update on public.event_requests
  for each row execute function public.set_updated_at();

create table public.event_attendees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  source text not null default 'request' check (source in ('request', 'invite')),
  confirmed_at timestamptz not null default now(),
  cancelled_at timestamptz,
  unique (event_id, profile_id)
);

create index event_attendees_event_idx on public.event_attendees (event_id);
create index event_attendees_profile_idx on public.event_attendees (profile_id);

alter table public.event_requests enable row level security;
alter table public.event_attendees enable row level security;
