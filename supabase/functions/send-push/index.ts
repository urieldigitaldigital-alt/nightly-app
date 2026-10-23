// Edge Function: delivers an OS-level push notification for a freshly
// inserted public.notifications row. Triggered by a Supabase Database
// Webhook on INSERT (configured in the dashboard, not in SQL — see
// supabase/migrations/0016_push_dni_checkin.sql's header comment).
//
// Deliberately NOT invoked synchronously from inside the RPCs that write
// notifications (accept_event_request etc.) — several of those already hold
// row locks (`for update`), and a flaky/slow network call to Expo has no
// business extending that lock window. The webhook decouples delivery from
// the transaction entirely.
//
// Deploy: supabase functions deploy send-push
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY as function secrets
// (same as delete-account/admin-moderate). The Database Webhook itself must
// be configured to send `Authorization: Bearer <service_role_key>` so this
// function can confirm the call actually came from Supabase's own trigger,
// not an arbitrary caller who found the URL.
import { createClient } from 'jsr:@supabase/supabase-js@2';

type WebhookPayload = {
  type: 'INSERT';
  table: 'notifications';
  record: {
    id: string;
    profile_id: string;
    type: string;
    title: string;
    body: string;
    data: Record<string, unknown>;
  };
};

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK_SIZE = 100; // Expo's documented per-request limit.

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response(JSON.stringify({ error: 'Not authorized' }), { status: 401 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const payload: WebhookPayload = await req.json();
  const notification = payload.record;

  const { data: profile } = await admin
    .from('profiles')
    .select('notification_prefs')
    .eq('id', notification.profile_id)
    .single();

  const prefs = (profile?.notification_prefs ?? {}) as Record<string, boolean>;
  const enabled = prefs[notification.type] ?? true; // opt-out model: missing key defaults to on.
  if (!enabled) {
    return new Response(JSON.stringify({ ok: true, skipped: 'muted' }), { status: 200 });
  }

  const { data: tokens } = await admin
    .from('device_tokens')
    .select('expo_push_token')
    .eq('profile_id', notification.profile_id);

  if (!tokens || tokens.length === 0) {
    return new Response(JSON.stringify({ ok: true, skipped: 'no_tokens' }), { status: 200 });
  }

  const messages = tokens.map((t) => ({
    to: t.expo_push_token,
    title: notification.title,
    body: notification.body,
    data: { ...notification.data, notification_id: notification.id, type: notification.type },
    sound: 'default' as const,
  }));

  const staleTokens: string[] = [];

  for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
    const chunk = messages.slice(i, i + CHUNK_SIZE);
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(chunk),
    });
    const result = await response.json().catch(() => null);
    const tickets: any[] = result?.data ?? [];

    tickets.forEach((ticket, idx) => {
      if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
        staleTokens.push(chunk[idx].to);
      }
    });
  }

  if (staleTokens.length > 0) {
    await admin.from('device_tokens').delete().in('expo_push_token', staleTokens);
  }

  return new Response(JSON.stringify({ ok: true, sent: messages.length, pruned: staleTokens.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
