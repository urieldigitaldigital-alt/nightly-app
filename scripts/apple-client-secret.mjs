#!/usr/bin/env node
/**
 * Genera el "client secret" de Sign in with Apple.
 *
 *   node scripts/apple-client-secret.mjs ~/Documentos/AuthKey_KFS3BLBPJM.p8
 *
 * Supabase (y cualquier otro backend que hable OAuth con Apple) no acepta el
 * archivo .p8 tal cual: pide un JWT firmado con esa clave. Eso es lo que
 * genera este script, y es también el motivo por el que el dashboard de
 * Supabase avisa que "las claves secretas de Apple vencen cada 6 meses" —
 * Apple no deja firmar uno que dure más.
 *
 * El .p8 se lee del disco y nunca sale de esta máquina: lo único que se
 * imprime es el JWT, que es lo que va pegado en Supabase.
 *
 * Cuando falten unas semanas para el vencimiento, se vuelve a correr esto con
 * el mismo .p8 y se reemplaza el valor en Supabase. Si se deja vencer, el
 * login con Apple en web deja de andar.
 */

import { readFileSync } from 'node:fs';
import { createPrivateKey, sign } from 'node:crypto';

// ---------------------------------------------------------------------------
// Datos de la cuenta de Apple de Afterdune.
// ---------------------------------------------------------------------------

const TEAM_ID = process.env.APPLE_TEAM_ID ?? '26FHY23TDL';
const KEY_ID = process.env.APPLE_KEY_ID ?? 'KFS3BLBPJM';

/**
 * El `sub` del token es el **Services ID**, no el bundle ID: este secreto se
 * usa en el flujo OAuth de web, que es el único donde Apple lo pide. El login
 * nativo de iOS no lo usa — ahí Apple valida el id_token contra la lista de
 * Client IDs configurada en Supabase.
 */
const CLIENT_ID = process.env.APPLE_CLIENT_ID ?? 'com.afterdune.signin';

/** Apple rechaza cualquier cosa de más de 6 meses. Se deja un margen. */
const DIAS_DE_VIGENCIA = 170;

// ---------------------------------------------------------------------------

const rutaP8 = process.argv[2];

if (!rutaP8) {
  console.error('Falta la ruta del archivo .p8.\n');
  console.error('  node scripts/apple-client-secret.mjs ~/ruta/AuthKey_KFS3BLBPJM.p8\n');
  console.error('Es el archivo que descargaste de developer.apple.com → Keys.');
  process.exit(1);
}

function base64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

let pem;
try {
  pem = readFileSync(rutaP8.replace(/^~/, process.env.HOME ?? '~'), 'utf8');
} catch (e) {
  console.error(`No se pudo leer ${rutaP8}: ${e.message}`);
  process.exit(1);
}

if (!pem.includes('BEGIN PRIVATE KEY')) {
  console.error('Ese archivo no parece una clave .p8 de Apple.');
  console.error('Tiene que empezar con "-----BEGIN PRIVATE KEY-----".');
  process.exit(1);
}

let privateKey;
try {
  privateKey = createPrivateKey(pem);
} catch (e) {
  console.error(`La clave no se pudo interpretar: ${e.message}`);
  process.exit(1);
}

const ahora = Math.floor(Date.now() / 1000);
const vence = ahora + DIAS_DE_VIGENCIA * 24 * 60 * 60;

const header = { alg: 'ES256', kid: KEY_ID, typ: 'JWT' };
const payload = {
  iss: TEAM_ID,
  iat: ahora,
  exp: vence,
  aud: 'https://appleid.apple.com',
  sub: CLIENT_ID,
};

const entrada = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;

// `ieee-p1363` devuelve la firma cruda r||s, que es lo que espera JWS para
// ES256. Sin esta opción Node firma en DER y Apple rechaza el token.
const firma = sign('sha256', Buffer.from(entrada), { key: privateKey, dsaEncoding: 'ieee-p1363' });

const jwt = `${entrada}.${base64url(firma)}`;

console.log('\n──────────────────────────────────────────────');
console.log('Client secret para Supabase → Authentication → Providers → Apple');
console.log('Campo: "Secret Key (for OAuth)"');
console.log('──────────────────────────────────────────────\n');
console.log(jwt);
console.log(`\nTeam ID:   ${TEAM_ID}`);
console.log(`Key ID:    ${KEY_ID}`);
console.log(`Client ID: ${CLIENT_ID}`);
console.log(`Vence:     ${new Date(vence * 1000).toLocaleDateString('es-AR')} (en ${DIAS_DE_VIGENCIA} días)`);
console.log('\nAnotate esa fecha: cuando venza, el login con Apple en web deja de');
console.log('andar y hay que volver a correr esto con el mismo .p8.\n');
