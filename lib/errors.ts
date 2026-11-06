/**
 * Traduce cualquier error que llegue de la red, de Supabase o de las
 * validaciones propias a una sola frase en castellano que el usuario pueda
 * leer y accionar.
 *
 * Existe porque la alternativa — un `catch` con un "Algo salió mal" distinto
 * en cada pantalla — esconde justo la información que la persona necesita
 * ("no tenés internet" vs "ese texto está bloqueado" vs "ya existe esa
 * cuenta") y porque Apple rechaza por Guideline 2.1 las apps que responden a
 * un error con una pantalla muerta.
 */

import { ContentBlockedError } from '@/lib/moderation';

/**
 * Prefijo que usan los triggers de moderación en la base para marcar un
 * mensaje como "mostrable tal cual" (ver `0023_content_moderation.sql`).
 */
const DB_BLOCKED_PREFIX = 'CONTENT_BLOCKED:';

export const GENERIC_ERROR = 'Algo salió mal. Probá de nuevo en unos segundos.';
export const OFFLINE_ERROR = 'No hay conexión. Revisá tu internet y probá de nuevo.';

/** Errores de red de fetch, que llegan con formas distintas según la plataforma. */
function isNetworkError(message: string): boolean {
  return (
    message.includes('Network request failed') ||
    message.includes('Failed to fetch') ||
    message.includes('NetworkError') ||
    message.includes('ERR_INTERNET_DISCONNECTED') ||
    message.includes('ERR_NETWORK')
  );
}

const SUPABASE_MESSAGES: ReadonlyArray<[RegExp, string]> = [
  [/already registered|already been registered/i, 'Ese email ya tiene una cuenta. Probá iniciar sesión.'],
  [/invalid login credentials/i, 'Email o contraseña incorrectos.'],
  [/email not confirmed/i, 'Todavía no confirmaste tu email. Revisá tu casilla.'],
  [/duplicate key.*username|profiles_username_key/i, 'Ese usuario ya está en uso.'],
  [/for security purposes|rate limit|too many requests/i, 'Demasiados intentos. Esperá un minuto y probá de nuevo.'],
  [/jwt expired|invalid claim|session.*expired/i, 'Tu sesión venció. Volvé a iniciar sesión.'],
  [/row-level security|permission denied/i, 'No tenés permiso para hacer esto.'],
  [/password should be at least/i, 'La contraseña debe tener al menos 8 caracteres.'],
  [/new row violates check constraint "profiles_adult_check"/i, 'Afterdune es para mayores de 18 años.'],
];

/**
 * @param error     Lo que haya caído en el `catch` — no se asume ninguna forma.
 * @param fallback  Qué decir cuando el error no se reconoce. Conviene que sea
 *                  específico de la acción ("No pudimos guardar los cambios")
 *                  en vez del genérico.
 */
export function userFacingError(error: unknown, fallback: string = GENERIC_ERROR): string {
  if (error instanceof ContentBlockedError) return error.message;

  const message =
    typeof error === 'string'
      ? error
      : error && typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message ?? '')
        : '';

  if (!message) return fallback;

  // Lo que el trigger de moderación ya escribió pensando en el usuario final.
  const blockedAt = message.indexOf(DB_BLOCKED_PREFIX);
  if (blockedAt !== -1) return message.slice(blockedAt + DB_BLOCKED_PREFIX.length).trim();

  if (isNetworkError(message)) return OFFLINE_ERROR;

  for (const [pattern, translation] of SUPABASE_MESSAGES) {
    if (pattern.test(message)) return translation;
  }

  return fallback;
}

/**
 * `true` si el error es de conectividad — las pantallas lo usan para ofrecer
 * "Reintentar" en vez de mandar a la persona a cambiar lo que escribió.
 */
export function isOfflineError(error: unknown): boolean {
  const message =
    error && typeof error === 'object' && 'message' in error ? String((error as { message: unknown }).message ?? '') : String(error ?? '');
  return isNetworkError(message);
}
