import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export type SignUpInput = {
  email: string;
  password: string;
  username: string;
  displayName: string;
  birthdate: string; // ISO yyyy-mm-dd
};

export async function signUp({ email, password, username, displayName, birthdate }: SignUpInput) {
  // username/display_name/birthdate ride along as auth metadata; the
  // handle_new_user() trigger (0002_profiles.sql) reads them to create the
  // matching row in public.profiles in the same transaction as the signup.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username, display_name: displayName, birthdate },
    },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

/** "Continuar con Google". Google never gives us a real birthdate, so a
 * first-time Google signup lands with birthdate_confirmed=false (see
 * 0014_oauth_signup.sql) — app/_layout.tsx's guard sends those users to
 * confirm-birthdate before letting them into the app. */
/** True when running as an iOS/Android "Add to Home Screen" app rather than
 * a normal browser tab. `navigator.standalone` is the (non-standard but
 * only) way iOS Safari exposes this; `display-mode: standalone` is the
 * cross-platform media query other browsers use. */
function isStandaloneWebApp(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean((window.navigator as any).standalone) || window.matchMedia?.('(display-mode: standalone)').matches;
}

export async function signInWithGoogle() {
  if (Platform.OS === 'web') {
    // A normal full-page redirect to accounts.google.com and back is what
    // "Add to Home Screen" apps are supposed to handle, but iOS Safari
    // reliably drops standalone mode and reopens the return trip in a
    // regular Safari tab instead — a popup keeps the standalone window's
    // own location untouched the whole time, which avoids that entirely.
    if (isStandaloneWebApp()) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/`, skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (!data.url) throw new Error('NO_OAUTH_URL');

      const popup = window.open(data.url, 'nightly-google-auth', 'width=480,height=640');
      if (!popup) throw new Error('POPUP_BLOCKED');

      await new Promise<void>((resolve) => {
        const timer = setInterval(() => {
          if (popup.closed) {
            clearInterval(timer);
            resolve();
          }
        }, 400);
        setTimeout(() => {
          clearInterval(timer);
          resolve();
        }, 120000);
      });

      // The popup loaded our own app at our own origin and wrote the new
      // session to localStorage itself (see the window.opener self-close
      // logic in app/_layout.tsx) — supabase-js syncs that across tabs on
      // its own, but re-check explicitly in case the storage event raced.
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('OAUTH_INCOMPLETE');
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      // Trailing slash so this matches a `<site>/**` entry in Supabase's
      // redirect-URL allowlist unambiguously — some glob matchers don't
      // treat `**` as matching zero path segments.
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) throw error;
    return;
  }

  const redirectTo = Linking.createURL('auth-callback');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error('NO_OAUTH_URL');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success' || !result.url) return;

  const url = new URL(result.url);
  const fragment = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.search.replace('?', ''));
  const access_token = fragment.get('access_token');
  const refresh_token = fragment.get('refresh_token');
  if (access_token && refresh_token) {
    const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
    if (sessionError) throw sessionError;
  }
}

export async function confirmBirthdate(birthdate: string) {
  const { error } = await supabase.rpc('confirm_birthdate', { p_birthdate: birthdate });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function requestPasswordReset(email: string) {
  // Native opens the app via the nightly:// deep link; web needs an actual
  // page on the deployed site to land on, since there's no app to catch a
  // custom scheme there.
  const redirectTo = Platform.OS === 'web' ? `${window.location.origin}/reset-password` : 'nightly://reset-password';

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export function onAuthStateChange(callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]) {
  return supabase.auth.onAuthStateChange(callback);
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

/** Account deletion is irreversible and touches auth.users, so it's an Edge
 * Function call (service_role) rather than a client-side RLS-governed write. */
export async function requestAccountDeletion() {
  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error) throw error;
}
