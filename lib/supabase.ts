import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * True once a real Supabase project is configured. Screens use this to show
 * an explicit "backend not configured" state instead of silently failing or
 * pretending demo data is real.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    '[nightly] EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY are not set. ' +
      'Copy .env.example to .env and fill in your Supabase project credentials.'
  );
}

/**
 * Intentionally untyped against Database — this project's types/database.ts
 * is hand-written (no live Supabase project to run `supabase gen types` for
 * real generated types), and postgrest-js's generic inference is strict
 * enough that a hand-rolled Database type produces cascading `never` types
 * across every query instead of useful safety. Each service function types
 * its own inputs/outputs explicitly against types/models.ts instead.
 */
export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Only web needs this: the password-reset email link lands back on the
    // site with the recovery token in the URL, and supabase-js needs to pick
    // it up from there. Native handles the equivalent via the nightly://
    // deep link instead, so it doesn't need URL parsing.
    detectSessionInUrl: Platform.OS === 'web',
  },
});
