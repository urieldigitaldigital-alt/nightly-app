-- Chat photos: messages can now carry an image instead of (or in principle
-- alongside) text. body becomes nullable — the existing check constraint
-- required 1-2000 chars on every message, which would reject an image-only
-- send. Looked up by definition rather than assumed name, same reasoning as
-- 0016_push_dni_checkin.sql: Postgres's auto-generated name for an inline
-- column CHECK isn't guaranteed across versions.
do $$
declare
  v_constraint_name text;
begin
  select conname into v_constraint_name
    from pg_constraint
    where conrelid = 'public.messages'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%char_length(body)%';

  if v_constraint_name is not null then
    execute format('alter table public.messages drop constraint %I', v_constraint_name);
  end if;
end $$;

alter table public.messages alter column body drop not null;
alter table public.messages add column image_path text;
alter table public.messages add constraint messages_body_or_image_check
  check (
    (body is not null and char_length(body) between 1 and 2000)
    or image_path is not null
  );

-- Private bucket, same shape as dni-photos (0016) but simpler: any member of
-- the conversation a photo belongs to is allowed to read it, which
-- is_conversation_member() (0010_rls.sql) already expresses directly as an
-- RLS policy — no edge function needed here, unlike DNI photos which must
-- stay hidden from everyone except the specific organizer reviewing that
-- specific request.
insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', false)
on conflict (id) do nothing;

-- Path convention: `{conversationId}/{senderId}-{timestamp}.ext`.
create policy "conversation members read that conversation's chat images"
  on storage.objects for select
  using (
    bucket_id = 'chat-images'
    and public.is_conversation_member(((storage.foldername(name))[1])::uuid)
  );

create policy "conversation members upload to that conversation's chat images"
  on storage.objects for insert
  with check (
    bucket_id = 'chat-images'
    and public.is_conversation_member(((storage.foldername(name))[1])::uuid)
  );
