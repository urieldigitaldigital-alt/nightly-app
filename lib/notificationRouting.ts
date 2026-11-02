import { useRouter } from 'expo-router';

/** Shared by app/notifications.tsx (tapping a row in-app) and
 * usePushNotifications.ts (tapping the OS push banner) — both end up with
 * the same `data` shape (the notifications.data jsonb column, passed
 * through as-is by supabase/functions/send-push), so the routing decision
 * only needs to live in one place. */
export function routeFromNotificationData(router: ReturnType<typeof useRouter>, data: Record<string, unknown> | null | undefined) {
  if (!data) return;
  const conversationId = data.conversation_id as string | undefined;
  const eventId = data.event_id as string | undefined;
  const type = data.type as string | undefined;

  if (conversationId) router.push(`/chat/${conversationId}`);
  // Go straight to the requests list, not the event page first — the whole
  // point of tapping this is to review/accept the request itself.
  else if (eventId && type === 'new_request') router.push(`/event/${eventId}/requests`);
  else if (eventId) router.push(`/event/${eventId}`);
}
