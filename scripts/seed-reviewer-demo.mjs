#!/usr/bin/env node
/**
 * Crea la cuenta demo que se le entrega al revisor de la App Store, con
 * contenido real adentro: una fiesta publicada, una solicitud de asistencia y
 * una conversación con mensajes.
 *
 * Por qué hace falta: Apple rechaza por Guideline 2.1 las apps donde el
 * revisor abre la cuenta de prueba y encuentra todo vacío, porque no puede
 * evaluar las funciones. La cuenta tiene que verse como una cuenta usada.
 *
 * El script no inventa datos sueltos en la base: crea los usuarios con la
 * Admin API y después hace todo lo demás *como esos usuarios*, llamando a las
 * mismas funciones que llama la app. Así el contenido pasa por las mismas RLS
 * y los mismos triggers que el de cualquier persona — si algo de eso está
 * roto, este script falla en vez de dejar datos imposibles.
 *
 * Uso:
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-reviewer-demo.mjs
 *
 * La URL y la anon key se leen de .env / .env.local (EXPO_PUBLIC_SUPABASE_URL
 * y EXPO_PUBLIC_SUPABASE_ANON_KEY). La service role key NO se guarda en
 * ningún archivo: se pasa por variable de entorno en el momento.
 */

import { readFileSync, existsSync } from 'node:fs';
import zlib from 'node:zlib';
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    out[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

const fileEnv = { ...loadEnvFile('.env'), ...loadEnvFile('.env.local') };
const env = { ...fileEnv, ...process.env };

const SUPABASE_URL = env.EXPO_PUBLIC_SUPABASE_URL;
const ANON_KEY = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('Faltan EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY (revisá tu .env).');
  process.exit(1);
}
/**
 * Sin la service role key el script sigue andando, pero no puede crear las
 * cuentas ni tocar sus perfiles: solo carga el contenido iniciando sesión como
 * ellas. Sirve para cuando las cuentas ya se crearon a mano desde el dashboard
 * (Authentication → Users → Add user, con "Auto confirm user" marcado) y lo
 * único que falta es llenarlas.
 */
const ADMIN_MODE = Boolean(SERVICE_ROLE_KEY);

if (!ADMIN_MODE) {
  console.warn('Sin SUPABASE_SERVICE_ROLE_KEY: modo solo-contenido.');
  console.warn('Las dos cuentas demo tienen que existir ya y estar confirmadas.\n');
}

// La contraseña se puede fijar desde afuera para no cambiarla en cada corrida
// — es la que se pega en App Store Connect, así que conviene que sea estable.
const DEMO_PASSWORD = env.DEMO_PASSWORD ?? 'AppReview2026!';

/** Título de la fiesta demo. Se usa también para detectar si ya se sembró. */
const DEMO_EVENT_TITLE = 'Previa frente al mar';

const REVIEWER = {
  email: env.DEMO_EMAIL ?? 'appreview@afterdune.app',
  username: 'appreview',
  displayName: 'App Review',
  birthdate: '1995-03-14',
};

// Segunda cuenta: sin alguien del otro lado no hay chat que mostrar, ni
// solicitud que el revisor pueda aceptar o rechazar.
const HOST = {
  email: env.DEMO_HOST_EMAIL ?? 'demo.host@afterdune.app',
  username: 'lucia_demo',
  displayName: 'Lucía Demo',
  birthdate: '1997-08-02',
};

const admin = ADMIN_MODE ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } }) : null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Crea el usuario, o devuelve el existente si ya está.
 *
 * Idempotente a propósito: este script se corre de nuevo cada vez que hay que
 * refrescar la demo antes de un envío, y no tendría que explotar porque la
 * cuenta ya existe de la vez anterior.
 */
async function ensureUser({ email, username, displayName, birthdate }) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    // Sin esto la cuenta queda esperando el mail de confirmación y el revisor
    // no podría entrar.
    email_confirm: true,
    user_metadata: { username, display_name: displayName, birthdate },
  });

  if (!error) return data.user;

  const alreadyExists = /already been registered|already exists/i.test(error.message);
  if (!alreadyExists) throw error;

  const { data: list, error: listError } = await admin.auth.admin.listUsers();
  if (listError) throw listError;
  const existing = list.users.find((u) => u.email === email);
  if (!existing) throw error;

  // Realinea la contraseña con la que se va a entregar, por si cambió.
  await admin.auth.admin.updateUserById(existing.id, { password: DEMO_PASSWORD });
  return existing;
}

/** Cliente autenticado como ese usuario, con la anon key: el mismo camino que la app. */
async function clientFor(email) {
  const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password: DEMO_PASSWORD });
  if (error) throw new Error(`No se pudo iniciar sesión como ${email}: ${error.message}`);
  return client;
}

/** Marca el onboarding como hecho para que la cuenta entre directo al feed. */
async function completeOnboarding(userId) {
  const { error } = await admin
    .from('profiles')
    .update({
      // El guard de app/_layout.tsx manda a onboarding mientras esto sea
      // null, así que sin esta marca el revisor entraría al wizard en vez de
      // al feed.
      onboarding_completed_at: new Date().toISOString(),
      birthdate_confirmed: true,
      city: 'Pinamar',
      music_interests: ['Electrónica', 'Reggaetón'],
      bio: 'Cuenta de demostración para la revisión de la App Store.',
    })
    .eq('id', userId);
  if (error) console.warn(`  aviso: no se pudo completar el onboarding (${error.message})`);
}

/**
 * Sube un marcador de posición al bucket de fotos de DNI y devuelve su ruta.
 *
 * Pedir lugar en una fiesta exige una foto de documento (`DNI_REQUIRED` en
 * `request_event_access`), así que sin un archivo acá la demo no puede tener
 * una solicitud cargada.
 *
 * Es un PNG gris liso, a propósito: fabricar algo que parezca un documento de
 * identidad real sería crear un documento falso. Esto es claramente un relleno
 * y cumple la única función que importa para la demo, que es existir.
 */
async function uploadPlaceholderDni(client, requesterId, eventId) {
  const path = `${requesterId}/${eventId}-demo.png`;

  // Sin `upsert`: la política del bucket solo autoriza INSERT (cada quien a su
  // propia carpeta), no UPDATE. Pedir un upsert hace que Storage intente
  // actualizar y RLS lo rechaza con "new row violates row-level security".
  const { error } = await client.storage.from('dni-photos').upload(path, solidGrayPng(), {
    contentType: 'image/png',
  });

  // Que ya exista es exactamente lo que se busca al re-correr el script.
  if (error && !/already exists|Duplicate/i.test(error.message)) {
    throw new Error(`No se pudo subir el marcador de DNI: ${error.message}`);
  }
  return path;
}

/** PNG de 8x8 gris, armado a mano para no depender de ninguna biblioteca. */
function solidGrayPng() {
  const { deflateSync } = zlib;
  const size = 8;
  // Cada fila va precedida por un byte de filtro (0 = sin filtro), y cada
  // píxel son tres bytes RGB.
  const raw = Buffer.alloc(size * (1 + size * 3), 0x9a);
  for (let y = 0; y < size; y++) raw[y * (1 + size * 3)] = 0;

  const chunk = (type, data) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeAndData) >>> 0);
    return Buffer.concat([length, typeAndData, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // profundidad de bits
  ihdr[9] = 2; // color RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function crc32(buf) {
  let crc = ~0;
  for (const byte of buf) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc;
}

function inDays(days, hour) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function main() {
  console.log(`Sembrando la demo en ${SUPABASE_URL}\n`);

  console.log('1/5  Preparando cuentas...');
  if (ADMIN_MODE) {
    const reviewerUser = await ensureUser(REVIEWER);
    const hostUser = await ensureUser(HOST);
    await completeOnboarding(reviewerUser.id);
    await completeOnboarding(hostUser.id);
  } else {
    console.log('     (se usan las que ya existen)');
  }
  console.log(`     revisor:    ${REVIEWER.email}`);
  console.log(`     anfitriona: ${HOST.email}`);

  const hostClient = await clientFor(HOST.email);
  const reviewerClient = await clientFor(REVIEWER.email);

  // Los ids salen de la sesión, no del admin: así el modo solo-contenido
  // tiene todo lo que necesita sin la service role key.
  const reviewer = (await reviewerClient.auth.getUser()).data.user;
  const host = (await hostClient.auth.getUser()).data.user;
  if (!reviewer || !host) throw new Error('No se pudo resolver el id de alguna de las cuentas demo.');

  console.log('2/5  Publicando una fiesta como la anfitriona...');

  // Idempotencia: si ya hay una fiesta demo publicada, se reutiliza en vez de
  // acumular una copia nueva por cada corrida del script.
  const { data: existing } = await hostClient
    .from('events')
    .select('id')
    .eq('organizer_id', host.id)
    .eq('title', DEMO_EVENT_TITLE)
    .maybeSingle();

  let eventId = existing?.id ?? null;

  if (eventId) {
    console.log(`     ya existía: ${eventId}`);
  } else {
  const { data: created, error: eventError } = await hostClient.rpc('create_event_with_location', {
    p_category_slug: 'previa',
    p_title: DEMO_EVENT_TITLE,
    p_description:
      'Juntada tranquila antes de salir, con música, picada y buena onda. Traete algo para compartir. Cupo limitado, pedí lugar y te confirmo.',
    p_venue_type: 'casa',
    p_city: 'Pinamar',
    p_neighborhood: 'Centro',
    p_exact_lat: -37.1075,
    p_exact_lng: -56.8597,
    p_exact_address: 'Av. Bunge 1200, Pinamar',
    p_starts_at: inDays(3, 22),
    p_ends_at: inDays(4, 3),
    p_min_age: 18,
    p_rules: 'Respeto ante todo. No se permite fumar adentro.',
    p_capacity: 25,
    p_access_mode: 'request',
    p_is_free: true,
    p_price_cents: null,
    p_request_deadline: inDays(3, 18),
    p_cover_image_url: null,
    p_organizer_confirmed_authorization: true,
  });
  if (eventError) throw new Error(`No se pudo crear la fiesta: ${eventError.message}`);
  // create_event_with_location devuelve `public.events`, o sea la fila entera,
  // no el id suelto.
  eventId = typeof created === 'string' ? created : created?.id;
  if (!eventId) throw new Error('La fiesta se creó pero no devolvió un id.');
  console.log(`     fiesta ${eventId}`);
  }

  console.log('3/5  Pidiendo lugar como el revisor...');
  const dniPath = await uploadPlaceholderDni(reviewerClient, reviewer.id, eventId);
  // p_dni_photo_path va explícito aunque sea null: hay dos versiones de esta
  // función (0009 y 0016) y sin el tercer parámetro Postgres no sabe cuál
  // elegir y falla con "could not choose the best candidate function".
  const { error: requestError } = await reviewerClient.rpc('request_event_access', {
    p_event_id: eventId,
    p_message: '¡Hola! Me sumo con un amigo.',
    p_dni_photo_path: dniPath,
  });
  if (requestError && !/duplicate|already/i.test(requestError.message)) {
    console.warn(`     aviso: no se pudo crear la solicitud (${requestError.message})`);
  }

  console.log('4/5  Abriendo la conversación...');
  const { data: conversationId, error: convError } = await hostClient.rpc('ensure_direct_conversation', {
    p_event_id: eventId,
    p_organizer_id: host.id,
    p_requester_id: reviewer.id,
  });
  if (convError) throw new Error(`No se pudo crear la conversación: ${convError.message}`);

  console.log('5/5  Escribiendo mensajes...');

  // Sin esto, cada corrida del script apila otra copia de la misma charla y
  // el chat de la demo termina repitiendo las mismas tres líneas N veces.
  const { count: yaHay } = await hostClient
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId);

  if (yaHay && yaHay > 0) {
    console.log(`     ya había ${yaHay} mensajes, no se agregan`);
    printCredentials();
    return;
  }

  const messages = [
    [hostClient, host.id, '¡Hola! Te confirmo el lugar, la dirección exacta te aparece en la fiesta.'],
    [reviewerClient, reviewer.id, 'Gracias, ahí la veo. ¿Llevo algo?'],
    [hostClient, host.id, 'Con que traigas algo para tomar estamos. Nos vemos a las 22.'],
  ];
  for (const [client, senderId, body] of messages) {
    const { error } = await client.from('messages').insert({ conversation_id: conversationId, sender_id: senderId, body });
    if (error) console.warn(`     aviso: no se pudo enviar un mensaje (${error.message})`);
  }

  printCredentials();
}

function printCredentials() {
  console.log('\n──────────────────────────────────────────────');
  console.log('Datos para "Sign-in information" en App Store Connect:');
  console.log(`  Usuario:    ${REVIEWER.email}`);
  console.log(`  Contraseña: ${DEMO_PASSWORD}`);
  console.log('──────────────────────────────────────────────\n');
}

main().catch((error) => {
  console.error('\nFalló el seed:', error.message);
  process.exit(1);
});
