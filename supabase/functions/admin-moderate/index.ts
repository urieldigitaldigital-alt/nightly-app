// Edge Function: privileged admin actions (suspend/verify a user, resolve a
// report, cancel an event for policy reasons). Runs with service_role so it
// can write role/verification columns that profiles_prevent_privilege_escalation
// (see 0002_profiles.sql) blocks for any non-service-role caller — regular
// RLS-governed updates can never grant admin or verified status, on purpose.
//
// Deploy: supabase functions deploy admin-moderate
import { createClient } from 'jsr:@supabase/supabase-js@2';

type Action =
  | { type: 'resolve_report'; reportId: string; resolution: 'actioned' | 'dismissed' }
  | { type: 'suspend_user'; userId: string }
  | { type: 'verify_organizer'; userId: string; verified: boolean }
  | { type: 'cancel_event'; eventId: string };

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401 });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const {
    data: { user },
  } = await callerClient.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: callerProfile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (callerProfile?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Not an admin' }), { status: 403 });
  }

  const action: Action = await req.json();
  let targetType = '';
  let targetId: string | null = null;

  switch (action.type) {
    case 'resolve_report':
      await admin.from('reports').update({ status: action.resolution, reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq('id', action.reportId);
      targetType = 'report';
      targetId = action.reportId;
      break;
    case 'suspend_user':
      await admin.from('profiles').update({ deleted_at: new Date().toISOString() }).eq('id', action.userId);
      targetType = 'profile';
      targetId = action.userId;
      break;
    case 'verify_organizer':
      await admin.from('profiles').update({ is_organizer_verified: action.verified }).eq('id', action.userId);
      targetType = 'profile';
      targetId = action.userId;
      break;
    case 'cancel_event':
      await admin.from('events').update({ status: 'cancelled' }).eq('id', action.eventId);
      targetType = 'event';
      targetId = action.eventId;
      break;
    default:
      return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400 });
  }

  await admin.from('admin_audit_logs').insert({
    admin_id: user.id,
    action: action.type,
    target_type: targetType,
    target_id: targetId,
    metadata: action,
  });

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
});
