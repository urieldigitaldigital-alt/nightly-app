import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

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
