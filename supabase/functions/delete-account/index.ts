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
// Optional: APPLE_TEAM_ID / APPLE_KEY_ID / APPLE_CLIENT_ID / APPLE_PRIVATE_KEY
// to also revoke the user's Sign in with Apple grant (see below).
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { readAppleConfig, revokeToken } from '../_shared/apple.ts';
import { CORS_HEADERS, preflight } from '../_shared/cors.ts';

async function removeAllUnderPrefix(adminClient: ReturnType<typeof createClient>, bucket: string, prefix: string) {
  const { data: files, error } = await adminClient.storage.from(bucket).list(prefix);
  if (error || !files || files.length === 0) return;
  const paths = files.map((f) => `${prefix}/${f.name}`);
  await adminClient.storage.from(bucket).remove(paths);
}

async function revokeAppleGrantIfAny(adminClient: ReturnType<typeof createClient>, userId: string) {
  const config = readAppleConfig();
  if (!config) {
    console.warn('delete-account: faltan las variables de entorno de Apple, no se revoca el permiso');
    return;
  }

  const { data, error } = await adminClient.from('apple_credentials').select('refresh_token').eq('user_id', userId).maybeSingle();

  if (error) {
    console.error('delete-account: no se pudo leer el refresh token de Apple', error.message);
    return;
  }
  // Sin fila: la persona nunca entró con Apple, o lo hizo antes de que
  // existiera `apple-link`. No hay nada que revocar.
  if (!data?.refresh_token) return;

  const revoked = await revokeToken(config, data.refresh_token as string);
  if (!revoked) console.error('delete-account: Apple rechazó la revocación para', userId);
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: CORS_HEADERS });
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
    return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401, headers: CORS_HEADERS });
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

  // Revocación del permiso de Sign in with Apple.
  //
  // Apple lo exige para cualquier app que ofrezca su login y permita borrar
  // la cuenta: no alcanza con borrar la cuenta de nuestro lado, hay que
  // avisarle a Apple que el permiso ya no corre.
  //
  // Todo este bloque es best-effort a propósito. Si faltan las credenciales,
  // si el usuario nunca entró con Apple, o si Apple responde mal, se deja
  // constancia en el log y se sigue: que alguien no pueda eliminar su cuenta
  // sería un incumplimiento peor (Guideline 5.1.1(v)) que no haber podido
  // notificar la revocación.
  await revokeAppleGrantIfAny(adminClient, user.id);

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), { status: 500, headers: CORS_HEADERS });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
});
