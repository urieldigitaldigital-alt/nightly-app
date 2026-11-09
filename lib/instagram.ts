/**
 * Normalización de cuentas de Instagram.
 *
 * Quien carga un boliche va a pegar cualquier cosa en ese campo: el usuario
 * pelado, con arroba, la URL entera copiada del navegador, o la URL con los
 * parámetros de seguimiento que Instagram agrega al compartir. Todo eso tiene
 * que terminar en el mismo usuario, porque es lo que se guarda en la base y
 * lo que después arma el enlace.
 */

/** Longitud máxima de un usuario de Instagram. */
const MAX_HANDLE_LENGTH = 30;

/**
 * Devuelve el usuario sin arroba ni URL, o `null` si no queda nada usable.
 *
 * Valida los caracteres además de recortar: Instagram solo permite letras,
 * números, punto y guion bajo. Sin esa validación, pegar un enlace a un
 * perfil de Facebook devolvería un "usuario" y armaríamos un enlace roto que
 * recién falla cuando alguien lo toca.
 */
export function instagramHandle(raw?: string | null): string | null {
  if (!raw) return null;

  const trimmed = raw.trim();
  const hadProtocol = /^https?:\/\//i.test(trimmed);
  let rest = trimmed.replace(/^https?:\/\//i, '').replace(/^www\./i, '');

  // Si lo que vino es una URL hay que comprobar de qué sitio es, no solo
  // recortarle el dominio. Quedarse con lo de antes de la primera barra
  // convertía `facebook.com/ufopoint` en el "usuario" facebook.com —pasa la
  // validación de caracteres porque el punto está permitido— y armábamos un
  // enlace roto que recién falla cuando alguien lo toca.
  //
  // Se considera URL si traía protocolo o si tiene una barra. Un usuario
  // suelto no tiene ninguna de las dos cosas, y eso deja entrar a los que
  // llevan punto, como `ufo.point`, que son válidos en Instagram.
  if (hadProtocol || rest.includes('/')) {
    const host = rest.split('/')[0].toLowerCase();
    if (host !== 'instagram.com' && host !== 'instagr.am') return null;
    rest = rest.slice(host.length).replace(/^\//, '');
  }

  const handle = rest
    .replace(/^@+/, '')
    // Todo lo que venga después del usuario: otra ruta, los parámetros de
    // seguimiento (`?igsh=…`) o un ancla.
    .replace(/[/?#].*$/, '')
    .trim();

  if (!handle || handle.length > MAX_HANDLE_LENGTH) return null;
  if (!/^[A-Za-z0-9._]+$/.test(handle)) return null;

  return handle;
}

/**
 * Enlace al perfil, o `null` si no hay cuenta cargada.
 *
 * Se usa a propósito la URL de la web y no el esquema `instagram://`. En iOS
 * y en Android la URL es un enlace universal: si la app está instalada la
 * abre sola, y si no, cae en el navegador. El esquema propio, en cambio,
 * falla sin aviso cuando la app no está.
 */
export function instagramUrl(raw?: string | null): string | null {
  const handle = instagramHandle(raw);
  return handle ? `https://www.instagram.com/${handle}/` : null;
}
