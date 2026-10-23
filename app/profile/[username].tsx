import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { colors, spacing, typography } from '@/constants/theme';
import { fetchProfileByIdOrUsername } from '@/services/profiles';
import { countFollowers, countFollowing, followUser, isFollowing, unfollowUser } from '@/services/follows';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';

export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const myProfile = useAuthStore((s) => s.profile);
  const [following, setFollowing] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['public-profile', username],
    queryFn: () => fetchProfileByIdOrUsername(username),
    enabled: Boolean(username),
  });

  const { data: counts } = useQuery({
    queryKey: ['follow-counts', profile?.id],
    queryFn: async () => {
      const [followers, following] = await Promise.all([countFollowers(profile!.id), countFollowing(profile!.id)]);
      return { followers, following };
    },
    enabled: Boolean(profile?.id),
  });

  const { data: organizedEvents } = useQuery({
    queryKey: ['organizer-events', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, cover_image_url, starts_at')
        .eq('organizer_id', profile!.id)
        .eq('status', 'published')
        .order('starts_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(profile?.id),
  });

  useEffect(() => {
    if (profile?.id) isFollowing(profile.id).then(setFollowing);
  }, [profile?.id]);

  if (isLoading || !profile) return <LoadingState fullscreen />;

  const isMe = myProfile?.id === profile.id;

  const toggleFollow = async () => {
    if (following) {
      await unfollowUser(profile.id);
      setFollowing(false);
    } else {
      await followUser(profile.id);
      setFollowing(true);
    }
  };

  return (
    <Screen edges={['top', 'bottom']} padded>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.profileHeader}>
        <Avatar uri={profile.avatarUrl} name={profile.displayName} size={88} />
        <View style={styles.nameRow}>
          <Text style={styles.name}>{profile.displayName}</Text>
          {profile.isVerified && <Ionicons name="checkmark-circle" size={18} color={colors.accent} />}
        </View>
        <Text style={styles.username}>@{profile.username}</Text>
        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

        <View style={styles.badges}>
          {profile.isOrganizerVerified && <Badge label="Organizador verificado" tone="accent" />}
          {profile.city && <Badge label={profile.city} tone="neutral" />}
        </View>

        <View style={styles.countsRow}>
          <Pressable
            style={styles.countItem}
            onPress={() => router.push({ pathname: `/profile/${username}/connections`, params: { tab: 'followers' } })}
          >
            <Text style={styles.countNumber}>{counts?.followers ?? '—'}</Text>
            <Text style={styles.countLabel}>Seguidores</Text>
          </Pressable>
          <Pressable
            style={styles.countItem}
            onPress={() => router.push({ pathname: `/profile/${username}/connections`, params: { tab: 'following' } })}
          >
            <Text style={styles.countNumber}>{counts?.following ?? '—'}</Text>
            <Text style={styles.countLabel}>Siguiendo</Text>
          </Pressable>
        </View>

        {!isMe && <Button label={following ? 'Siguiendo' : 'Seguir'} variant={following ? 'secondary' : 'primary'} onPress={toggleFollow} fullWidth={false} />}
      </View>

      <Text style={styles.sectionTitle}>Fiestas publicadas</Text>
      {!organizedEvents || organizedEvents.length === 0 ? (
        <Text style={styles.emptyText}>Todavía no publicó fiestas.</Text>
      ) : (
        <FlatList
          data={organizedEvents}
          keyExtractor={(e) => e.id}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item }) => (
            <Pressable style={styles.eventRow} onPress={() => router.push(`/event/${item.id}`)}>
              <Text style={styles.eventTitle}>{item.title}</Text>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  profileHeader: { alignItems: 'center', gap: spacing.xxs, marginBottom: spacing.xl },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, marginTop: spacing.sm },
  name: { color: colors.textPrimary, fontSize: typography.size.xl, fontWeight: typography.weight.bold },
  username: { color: colors.textSecondary, fontSize: typography.size.sm },
  bio: { color: colors.textSecondary, fontSize: typography.size.sm, textAlign: 'center', marginTop: spacing.xs },
  badges: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm, marginBottom: spacing.sm },
  countsRow: { flexDirection: 'row', gap: spacing.xl, marginBottom: spacing.sm },
  countItem: { alignItems: 'center' },
  countNumber: { color: colors.textPrimary, fontSize: typography.size.lg, fontWeight: typography.weight.bold },
  countLabel: { color: colors.textMuted, fontSize: typography.size.xs },
  sectionTitle: { color: colors.textPrimary, fontSize: typography.size.lg, fontWeight: typography.weight.semibold, marginBottom: spacing.sm },
  emptyText: { color: colors.textMuted, fontSize: typography.size.sm },
  eventRow: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  eventTitle: { color: colors.textPrimary, fontSize: typography.size.md, fontWeight: typography.weight.semibold },
});
