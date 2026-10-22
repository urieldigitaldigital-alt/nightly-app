create table public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null check (platform in ('ios', 'android', 'web')),
  created_at timestamptz not null default now()
);

create index device_tokens_profile_idx on public.device_tokens (profile_id);

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles (id),
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.device_tokens enable row level security;
alter table public.admin_audit_logs enable row level security;

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.event_requests;
alter publication supabase_realtime add table public.notifications;
