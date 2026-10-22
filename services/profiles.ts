import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/models';

function mapProfile(row: {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  music_interests: string[];
  role: 'user' | 'admin';
  is_verified: boolean;
  is_organizer_verified: boolean;
  created_at: string;
}): Profile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    city: row.city,
    musicInterests: row.music_interests,
    role: row.role,
    isVerified: row.is_verified,
    isOrganizerVerified: row.is_organizer_verified,
    createdAt: row.created_at,
  };
}

const PROFILE_COLUMNS = 'id, username, display_name, avatar_url, bio, city, music_interests, role, is_verified, is_organizer_verified, created_at';

export async function fetchProfile(profileId: string): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', profileId).single();

  if (error) throw error;
  return mapProfile(data);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Public profile routes accept either a user id (from chat/request contexts
 * that already have it) or a @username (from shareable profile links). */
export async function fetchProfileByIdOrUsername(param: string): Promise<Profile> {
  const query = supabase.from('profiles').select(PROFILE_COLUMNS);

  const { data, error } = UUID_RE.test(param) ? await query.eq('id', param).single() : await query.eq('username', param).single();

  if (error) throw error;
  return mapProfile(data);
}

export type UpdateProfileInput = Partial<{
  displayName: string;
  bio: string;
  city: string;
  musicInterests: string[];
  avatarUrl: string;
}>;

export async function updateMyProfile(input: UpdateProfileInput) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('NOT_AUTHENTICATED');

  const { error } = await supabase
    .from('profiles')
    .update({
      ...(input.displayName !== undefined && { display_name: input.displayName }),
      ...(input.bio !== undefined && { bio: input.bio }),
      ...(input.city !== undefined && { city: input.city }),
      ...(input.musicInterests !== undefined && { music_interests: input.musicInterests }),
      ...(input.avatarUrl !== undefined && { avatar_url: input.avatarUrl }),
    })
    .eq('id', user.id);

  if (error) throw error;
}

export type NotificationPrefs = Record<string, boolean>;

export async function fetchNotificationPrefs(): Promise<NotificationPrefs> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('NOT_AUTHENTICATED');

  const { data, error } = await supabase.from('profiles').select('notification_prefs').eq('id', user.id).single();
  if (error) throw error;
  return (data.notification_prefs as NotificationPrefs) ?? {};
}

export async function updateNotificationPrefs(prefs: NotificationPrefs) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('NOT_AUTHENTICATED');

  const { error } = await supabase.from('profiles').update({ notification_prefs: prefs }).eq('id', user.id);
  if (error) throw error;
}

/** Marks onboarding as finished. Called last (from the location-permission
 * screen) so the app/_layout.tsx auth guard doesn't jump to the tabs mid-flow. */
export async function finishOnboarding() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('NOT_AUTHENTICATED');

  const { error } = await supabase
    .from('profiles')
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq('id', user.id);

  if (error) throw error;
}
