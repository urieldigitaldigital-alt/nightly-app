-- Public buckets: profile photos and event cover/gallery images are shown in
-- the feed, so they're public-read. Nothing sensitive (exact addresses, IDs)
-- is ever uploaded here. Writes are still scoped to the owning user/event.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('event-images', 'event-images', true)
on conflict (id) do nothing;

create policy "avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "users upload only to their own avatar folder"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users replace only their own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users delete only their own avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "event images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'event-images');

create policy "organizers upload only to their own event's image folder"
  on storage.objects for insert
  with check (
    bucket_id = 'event-images'
    and public.is_event_organizer(((storage.foldername(name))[1])::uuid)
  );

create policy "organizers manage their own event's images"
  on storage.objects for update
  using (bucket_id = 'event-images' and public.is_event_organizer(((storage.foldername(name))[1])::uuid))
  with check (bucket_id = 'event-images' and public.is_event_organizer(((storage.foldername(name))[1])::uuid));

create policy "organizers delete their own event's images"
  on storage.objects for delete
  using (bucket_id = 'event-images' and public.is_event_organizer(((storage.foldername(name))[1])::uuid));
