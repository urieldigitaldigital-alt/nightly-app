alter table public.profiles
  add column notification_prefs jsonb not null default '{
    "new_request": true,
    "request_accepted": true,
    "request_rejected": true,
    "new_message": true,
    "event_invite": true,
    "event_time_changed": true,
    "event_location_changed": true,
    "event_cancelled": true,
    "event_upcoming": true,
    "capacity_changed": true
  }'::jsonb;
