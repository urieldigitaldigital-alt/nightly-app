import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/models';
import { fetchProfile } from '@/services/profiles';

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  onboardingCompleted: boolean;
  loading: boolean;
  initialize: () => () => void;
  refreshProfile: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  onboardingCompleted: false,
  loading: true,

  initialize: () => {
    let cancelled = false;

    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      await applySession(data.session, set);
      set({ loading: false });
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      await applySession(session, set);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  },

  refreshProfile: async () => {
    const session = get().session;
    if (!session) return;
    const profile = await fetchProfile(session.user.id);
    set({ profile, onboardingCompleted: Boolean((profile as any).onboardingCompletedAt) });
  },
}));

async function applySession(session: Session | null, set: (partial: Partial<AuthState>) => void) {
  if (!session) {
    set({ session: null, profile: null, onboardingCompleted: false });
    return;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(
        'id, username, display_name, avatar_url, bio, city, music_interests, role, is_verified, is_organizer_verified, created_at, onboarding_completed_at'
      )
      .eq('id', session.user.id)
      .single();

    if (error) throw error;

    const profile: Profile = {
      id: data.id,
      username: data.username,
      displayName: data.display_name,
      avatarUrl: data.avatar_url,
      bio: data.bio,
      city: data.city,
      musicInterests: data.music_interests,
      role: data.role,
      isVerified: data.is_verified,
      isOrganizerVerified: data.is_organizer_verified,
      createdAt: data.created_at,
    };

    set({ session, profile, onboardingCompleted: Boolean(data.onboarding_completed_at) });
  } catch {
    set({ session, profile: null, onboardingCompleted: false });
  }
}
