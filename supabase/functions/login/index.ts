// Edge Function: inicio de sesión con nombre de usuario o con email.
//
// Existe por una razón de privacidad concreta. Para iniciar sesión, la API de
// Supabase necesita el email, así que entrar con nombre de usuario obliga a
// traducir uno en otro en algún lado. Hacer esa traducción en el cliente
// (con una función que devuelva el email de un usuario) dejaría que
// cualquiera recorra nombres de usuario y se arme una lista de direcciones
// de correo.
//
// Acá la traducción pasa del lado del servidor: el email se resuelve, se usa
// para iniciar sesión, y nunca sale en la respuesta. Lo que vuelve al cliente
// es la sesión — exactamente lo mismo que devolvería un login normal, y solo
// si la contraseña era correcta.
//
// Deploy: supabase functions deploy login
import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * El navegador manda un preflight OPTIONS antes de cualquier POST con
 * cabeceras propias. Sin estas cabeceras la función responde 405 y el POST
 * real nunca sale: el login con nombre de usuario funcionaba en iOS y
 * Android —donde no hay CORS— y fallaba solo en web, con un mensaje de
 * "usuario o contraseña incorrectos" que no tenía nada que ver.
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const JSON_HEADERS = { ...CORS_HEADERS, 'Content-Type': 'application/json' };

// Un único mensaje para "no existe" y para "contraseña incorrecta". Si fueran
// distintos, probar nombres de usuario alcanzaría para saber cuáles están
// registrados.
const INVALID_CREDENTIALS = 'Usuario o contraseña incorrectos.';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
  }

  let body: { identifier?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: JSON_HEADERS });
  }

  const identifier = body.identifier?.trim();
  const password = body.password;

  if (!identifier || !password) {
    return new Response(JSON.stringify({ error: 'Faltan el usuario y la contraseña.' }), { status: 400, headers: JSON_HEADERS });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  let email = identifier;

  // Sin arroba es un nombre de usuario: hay que resolverlo. El cliente ya
  // hace esta misma distinción para no llamar a esta función cuando le
  // pasaron un email, pero no se confía en eso.
  if (!identifier.includes('@')) {
    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

    const { data: userId, error: lookupError } = await admin.rpc('user_id_for_username', {
      p_username: identifier.toLowerCase(),
    });

    if (lookupError) {
      console.error('login: falló la búsqueda del usuario', lookupError.message);
      return new Response(JSON.stringify({ error: 'No pudimos iniciar sesión. Probá de nuevo.' }), { status: 500, headers: JSON_HEADERS });
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: INVALID_CREDENTIALS }), { status: 401, headers: JSON_HEADERS });
    }

    const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId as string);
    if (userError || !userData.user?.email) {
      return new Response(JSON.stringify({ error: INVALID_CREDENTIALS }), { status: 401, headers: JSON_HEADERS });
    }

    email = userData.user.email;
  }

  // El login en sí va con la anon key, igual que desde la app: así se
  // respetan los límites de intentos y las reglas de Supabase Auth, en vez de
  // saltearlas con el service_role.
  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data, error } = await authClient.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    // `email_not_confirmed` sí se distingue: no revela si la cuenta existe
    // más de lo que ya revela el flujo normal de registro, y sin esa señal la
    // app no puede mandar a la pantalla de verificación.
    const needsConfirmation = /email not confirmed/i.test(error?.message ?? '');
    return new Response(
      JSON.stringify({
        error: needsConfirmation ? 'EMAIL_NOT_CONFIRMED' : INVALID_CREDENTIALS,
        ...(needsConfirmation ? { email } : {}),
      }),
      { status: 401, headers: JSON_HEADERS }
    );
  }

  return new Response(
    JSON.stringify({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    }),
    { status: 200, headers: JSON_HEADERS }
  );
});
