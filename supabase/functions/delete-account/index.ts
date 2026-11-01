// Edge Function: deletes the calling user's auth.users row (and, by FK
// cascade, their profile, events, messages, etc), after first cleaning up
// the Storage objects that cascade deletes can't reach — avatar, any event
// cover/gallery images for events they organized, and any DNI photo of
// theirs not yet purged by the nightly retention cron. Runs with the
// service_role key, which must never be shipped to the client — that's
// exactly why this has to be a server-side function instead of a plain
// RLS-governed delete.
//
// Deploy: supabase functions deploy delete-account
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to be set as function secrets.
import { createClient } from 'jsr:@supabase/supabase-js@2';

async function removeAllUnderPrefix(adminClient: ReturnType<typeof createClient>, bucket: string, prefix: string) {
  const { data: files, error } = await adminClient.storage.from(bucket).list(prefix);
  if (error || !files || files.length === 0) return;
  const paths = files.map((f) => `${prefix}/${f.name}`);
  await adminClient.storage.from(bucket).remove(paths);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Client scoped to the caller's own JWT, only to resolve who they are.
  const callerClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userError,
  } = await callerClient.auth.getUser();

  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Must run BEFORE deleteUser — once the user row is gone, the FK cascade
  // takes their `events` rows with it, and there'd be no way left to know
  // which event-images folders were theirs to clean up.
  const { data: ownedEvents } = await adminClient.from('events').select('id').eq('organizer_id', user.id);

  await Promise.all([
    removeAllUnderPrefix(adminClient, 'avatars', user.id),
    removeAllUnderPrefix(adminClient, 'dni-photos', user.id),
    ...(ownedEvents ?? []).map((e) => removeAllUnderPrefix(adminClient, 'event-images', e.id)),
  ]);

  // Apple Sign In token revocation: intentionally not implemented here.
  // It requires the app's Apple private key (.p8) plus Team ID/Key ID to
  // mint a client_secret JWT and call Apple's revoke endpoint, none of
  // which exist in this environment — see PENDIENTES_MANUALES.md. Deleting
  // the Supabase auth.users row (below) still fully removes the user's
  // access to this app; the gap is only that Apple itself wouldn't be
  // notified the grant was revoked.

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
});
