// Edge Function: canjea el `authorizationCode` de un login de Sign in with
// Apple por un refresh token y lo guarda para poder revocarlo el día que la
// persona elimine su cuenta.
//
// Corre justo después del login nativo porque el código de autorización vale
// una sola vez y vence en minutos. Si esto no corre, la eliminación de cuenta
// igual funciona — solo que Apple nunca se entera de que el permiso se
// revocó, que es exactamente lo que Apple pide evitar.
//
// Deploy: supabase functions deploy apple-link
// Secrets: APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_CLIENT_ID, APPLE_PRIVATE_KEY
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { exchangeAuthorizationCode, readAppleConfig } from '../_shared/apple.ts';
import { CORS_HEADERS, preflight } from '../_shared/cors.ts';

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

  const config = readAppleConfig();
  if (!config) {
    // Todavía no están cargadas las credenciales de Apple. No es un error del
    // cliente y no tiene sentido que lo vea el usuario: se responde ok y se
    // deja constancia en el log del servidor.
    console.warn('apple-link: faltan las variables de entorno de Apple, se omite el canje');
    return new Response(JSON.stringify({ ok: true, stored: false }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  let body: { authorizationCode?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: CORS_HEADERS });
  }

  if (!body.authorizationCode) {
    return new Response(JSON.stringify({ error: 'Missing authorizationCode' }), { status: 400, headers: CORS_HEADERS });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

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

  const refreshToken = await exchangeAuthorizationCode(config, body.authorizationCode);
  if (!refreshToken) {
    // Apple rechazó el canje (código vencido o ya usado). No se le rompe el
    // login a nadie por esto.
    return new Response(JSON.stringify({ ok: true, stored: false }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const adminClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { error: upsertError } = await adminClient
    .from('apple_credentials')
    .upsert({ user_id: user.id, refresh_token: refreshToken, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

  if (upsertError) {
    console.error('apple-link: no se pudo guardar el refresh token', upsertError.message);
    return new Response(JSON.stringify({ ok: true, stored: false }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true, stored: true }), {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
});
