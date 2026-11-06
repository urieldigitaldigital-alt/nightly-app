// Utilidades de Sign in with Apple compartidas por las Edge Functions.
//
// Apple exige (desde junio de 2022) que una app que ofrece Sign in with Apple
// y permite eliminar la cuenta llame además al endpoint de revocación, para
// que el permiso desaparezca también del lado de Apple y no solo del nuestro.
// Eso necesita dos cosas que Supabase no guarda por su cuenta:
//
//  1. Un `client_secret`, que no es una constante sino un JWT firmado con
//     ES256 usando la clave privada .p8 de la cuenta de desarrollador.
//  2. El refresh token del usuario, que Apple entrega una sola vez al
//     canjear el `authorizationCode` del login y nunca más.
//
// Por eso `apple-link` canjea y guarda el token al iniciar sesión, y
// `delete-account` lo usa al borrar la cuenta.

const APPLE_AUTH_HOST = 'https://appleid.apple.com';

export type AppleConfig = {
  teamId: string;
  keyId: string;
  clientId: string;
  privateKeyPem: string;
};

/**
 * Lee la configuración de Apple de las variables de entorno de la función.
 *
 * Devuelve `null` si falta cualquiera de las cuatro, en vez de tirar: la
 * revocación es un paso deseable pero nunca puede ser la razón por la que
 * alguien no logre borrar su cuenta.
 */
export function readAppleConfig(): AppleConfig | null {
  const teamId = Deno.env.get('APPLE_TEAM_ID');
  const keyId = Deno.env.get('APPLE_KEY_ID');
  const clientId = Deno.env.get('APPLE_CLIENT_ID');
  const privateKeyPem = Deno.env.get('APPLE_PRIVATE_KEY');

  if (!teamId || !keyId || !clientId || !privateKeyPem) return null;
  return { teamId, keyId, clientId, privateKeyPem };
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlEncodeJson(value: unknown): string {
  return base64UrlEncode(new TextEncoder().encode(JSON.stringify(value)));
}

/**
 * Importa la clave .p8 de Apple, que viene en PEM PKCS#8.
 *
 * El contenido suele llegar desde una variable de entorno con los saltos de
 * línea escapados como "\n" literales — se normalizan acá para que pegar el
 * archivo tal cual en el dashboard funcione igual.
 */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const normalized = pem.replace(/\\n/g, '\n');
  const body = normalized
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');

  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));

  return await crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

/**
 * Arma el `client_secret` que pide Apple: un JWT ES256 firmado con la clave
 * privada de la cuenta de desarrollador.
 *
 * Apple acepta como máximo 6 meses de vigencia; acá se usan 5 minutos porque
 * el token se arma al vuelo para una sola llamada y no se guarda en ningún
 * lado.
 */
export async function createClientSecret(config: AppleConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: 'ES256', kid: config.keyId, typ: 'JWT' };
  const payload = {
    iss: config.teamId,
    iat: now,
    exp: now + 300,
    aud: APPLE_AUTH_HOST,
    sub: config.clientId,
  };

  const signingInput = `${base64UrlEncodeJson(header)}.${base64UrlEncodeJson(payload)}`;
  const key = await importPrivateKey(config.privateKeyPem);

  // WebCrypto devuelve la firma ECDSA en formato crudo r||s, que es
  // exactamente lo que espera JWS para ES256 (a diferencia del DER que
  // devuelven otras bibliotecas y que habría que convertir).
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(signingInput));

  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
}

/**
 * Canjea el `authorizationCode` de un login de Apple por un refresh token.
 *
 * El código sirve una sola vez y dura apenas unos minutos, así que esto tiene
 * que correr enseguida del login.
 */
export async function exchangeAuthorizationCode(config: AppleConfig, code: string): Promise<string | null> {
  const clientSecret = await createClientSecret(config);

  const response = await fetch(`${APPLE_AUTH_HOST}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    console.error('Apple token exchange failed', response.status, await response.text());
    return null;
  }

  const data = await response.json();
  return typeof data.refresh_token === 'string' ? data.refresh_token : null;
}

/**
 * Revoca el permiso del usuario del lado de Apple.
 *
 * Devuelve `true` solo si Apple confirmó la revocación. Un `false` se
 * registra en el log pero no frena la eliminación de la cuenta.
 */
export async function revokeToken(config: AppleConfig, refreshToken: string): Promise<boolean> {
  const clientSecret = await createClientSecret(config);

  const response = await fetch(`${APPLE_AUTH_HOST}/auth/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: clientSecret,
      token: refreshToken,
      token_type_hint: 'refresh_token',
    }),
  });

  if (!response.ok) {
    console.error('Apple revoke failed', response.status, await response.text());
    return false;
  }

  return true;
}
