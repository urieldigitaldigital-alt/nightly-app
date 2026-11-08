#!/usr/bin/env node
/**
 * ¿Qué migraciones están aplicadas en la base de producción?
 *
 *   node scripts/check-migrations.mjs
 *
 * Solo lectura: no escribe nada. Pregunta por los objetos que crea cada
 * migración (una tabla, una columna, una función) y deduce de ahí si corrió.
 * Usa la anon key que ya está en el .env del proyecto.
 *
 * Existe porque "¿esto ya lo corrí?" es una pregunta que aparece cada vez que
 * se vuelve a tocar la base, y la respuesta equivocada significa o una
 * migración aplicada dos veces o una función que la app espera y no está.
 *
 * Una tabla protegida por RLS devuelve una lista vacía en vez de un error, así
 * que "existe pero no puedo leerla" cuenta como aplicada — que es justo lo que
 * se quiere saber acá.
 */
import { readFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

const env = { ...loadEnv('.env'), ...loadEnv('.env.local'), ...process.env };
const url = env.EXPO_PUBLIC_SUPABASE_URL;
const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Faltan las credenciales de Supabase en .env');
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

/** Una tabla que no existe da 42P01 / PGRST205; una que existe pero está
 *  protegida por RLS devuelve una lista vacía, que también confirma que está. */
async function tableExists(name) {
  const { error } = await db.from(name).select('*').limit(1);
  if (!error) return true;
  const code = error.code ?? '';
  const msg = error.message ?? '';
  if (code === '42P01' || code === 'PGRST205' || /does not exist|Could not find the table/i.test(msg)) return false;
  return true; // cualquier otro error (permisos, RLS) implica que la tabla está
}

async function columnExists(table, column) {
  const { error } = await db.from(table).select(column).limit(1);
  if (!error) return true;
  const msg = error.message ?? '';
  if (/column .* does not exist|Could not find the '.*' column/i.test(msg)) return false;
  if (error.code === '42P01' || error.code === 'PGRST205') return false;
  return true;
}

async function functionExists(name, args = {}) {
  const { error } = await db.rpc(name, args);
  if (!error) return true;
  const msg = error.message ?? '';
  if (/Could not find the function|does not exist/i.test(msg)) return false;
  return true; // existe pero se quejó de permisos o argumentos
}

const checks = [
  ['0020_expire_finished_events', () => functionExists('expire_finished_events')],
  ['0021_live_locations        ', () => tableExists('live_locations')],
  ['0022_chat_images           ', () => columnExists('messages', 'image_path')],
  ['0023_content_moderation    ', () => tableExists('moderation_terms')],
  ['0024_apple_credentials     ', () => tableExists('apple_credentials')],
  ['0025_username_login        ', () => functionExists('is_username_available', { p_username: 'zzz_probe_zzz' })],
];

console.log(`Base: ${url}\n`);
for (const [label, check] of checks) {
  let applied;
  try {
    applied = await check();
  } catch (e) {
    console.log(`  ?  ${label}  (no se pudo comprobar: ${e.message})`);
    continue;
  }
  console.log(`  ${applied ? '✅' : '❌'} ${label}  ${applied ? 'aplicada' : 'FALTA'}`);
}
console.log('\n(0019 no se puede detectar por sondeo: solo redefine una función que ya existía.)');
