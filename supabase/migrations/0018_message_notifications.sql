-- new_message has existed in notifications.type's check constraint since
-- 0007, but nothing ever created one — sendMessage() (services/chat.ts) is a
-- plain client-side insert into messages with no notification logic at all.
-- A trigger is the right place for this (not the client): it fires for
-- every member of the conversation regardless of 1:1 or group chat, and
-- stays consistent with every other notification in this app already being
-- created server-side. This is also what finally gets a real push through
-- the send-push pipeline for new messages, same as every other type.
create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_name text;
begin
  select display_name into v_sender_name from public.profiles where id = new.sender_id;

  insert into public.notifications (profile_id, type, title, body, data)
  select
    cm.profile_id, 'new_message', coalesce(v_sender_name, 'Nuevo mensaje'),
    left(new.body, 140), jsonb_build_object('conversation_id', new.conversation_id)
  from public.conversation_members cm
  where cm.conversation_id = new.conversation_id
    and cm.profile_id <> new.sender_id
    and cm.left_at is null;

  return new;
end;
$$;

create trigger messages_notify_new_message
  after insert on public.messages
  for each row execute function public.notify_new_message();
