import { Platform } from 'react-native';

/** Friendlier text for the Supabase/Google OAuth error codes we're likely
 * to actually see; anything else falls back to Supabase's own description. */
function translateOAuthError(code: string | null, description: string | null): string {
  if (code === 'access_denied') return 'Cancelaste el inicio de sesión con Google.';
  if (description) return description;
  return 'No pudimos completar el inicio de sesión con Google. Probá de nuevo.';
}

/**
 * Reads `error`/`error_description` off the current URL (Supabase appends
 * these as query params — sometimes as a hash fragment instead, depending on
 * where in the flow it failed — when the OAuth callback itself fails, e.g.
 * the redirect_to isn't allow-listed, the code/state is invalid, or Google
 * denied the request). Without this, that failure is invisible: the app's
 * route guard just sees no session and bounces back to the welcome screen
 * with no explanation. Clears the params from the URL once read so a page
 * refresh doesn't keep re-surfacing a stale error.
 */
export function consumeOAuthError(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;

  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '');

  const code = search.get('error') ?? hash.get('error');
  const description = search.get('error_description') ?? hash.get('error_description');
  if (!code && !description) return null;

  const message = translateOAuthError(code, description ? decodeURIComponent(description.replace(/\+/g, ' ')) : null);

  const url = new URL(window.location.href);
  url.searchParams.delete('error');
  url.searchParams.delete('error_description');
  url.searchParams.delete('error_code');
  window.history.replaceState({}, '', url.pathname + url.search);

  return message;
}
