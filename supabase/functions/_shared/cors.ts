/**
 * Cabeceras CORS para las Edge Functions que llama la app desde el navegador.
 *
 * El navegador manda un preflight `OPTIONS` antes de cualquier POST que lleve
 * cabeceras propias (y `functions.invoke` siempre manda `authorization` y
 * `apikey`). Si la función responde 405 a ese OPTIONS, el POST real **nunca
 * sale** y el cliente recibe un error de red genérico.
 *
 * Es un fallo que solo aparece en web: iOS y Android no aplican CORS, así que
 * las mismas funciones andaban perfecto en el teléfono. Se descubrió porque
 * el login con nombre de usuario fallaba en el navegador con un "usuario o
 * contraseña incorrectos" que no tenía nada que ver con la causa real.
 */

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** Respuesta al preflight. Llamar al principio de cada función. */
export function preflight(req: Request): Response | null {
  return req.method === 'OPTIONS' ? new Response('ok', { headers: CORS_HEADERS }) : null;
}
