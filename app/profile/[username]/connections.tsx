import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { fetchProfileByIdOrUsername } from '@/services/profiles';
import { listFollowers, listFollowing } from '@/services/follows';

type Tab = 'followers' | 'following';

export default function ConnectionsScreen() {
  const { username, tab: initialTab } = useLocalSearchParams<{ username: string; tab?: Tab }>();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab === 'following' ? 'following' : 'followers');

  const { data: profile } = useQuery({
    queryKey: ['public-profile', username],
    queryFn: () => fetchProfileByIdOrUsername(username),
    enabled: Boolean(username),
  });

  const { data: people, isLoading } = useQuery({
    queryKey: ['connections', profile?.id, tab],
    queryFn: () => (tab === 'followers' ? listFollowers(profile!.id) : listFollowing(profile!.id)),
    enabled: Boolean(profile?.id),
  });

  return (
    <Screen edges={['top', 'bottom']} padded>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>@{username}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabs}>
        <Pressable style={[styles.tab, tab === 'followers' && styles.tabActive]} onPress={() => setTab('followers')}>
          <Text style={[styles.tabText, tab === 'followers' && styles.tabTextActive]}>Seguidores</Text>
        </Pressable>
        <Pressable style={[styles.tab, tab === 'following' && styles.tabActive]} onPress={() => setTab('following')}>
          <Text style={[styles.tabText, tab === 'following' && styles.tabTextActive]}>Siguiendo</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <LoadingState />
      ) : !people || people.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="people-outline" size={36} color={colors.textMuted} />}
          title={tab === 'followers' ? 'Sin seguidores todavía' : 'No sigue a nadie todavía'}
          description=""
        />
      ) : (
        <FlatList
          data={people}
          keyExtractor={(p) => p.id}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => router.push(`/profile/${item.username}`)}>
              <Avatar uri={item.avatar_url} name={item.display_name} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.display_name}</Text>
                <Text style={styles.username}>@{item.username}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  title: { color: colors.textPrimary, fontSize: typography.size.lg, fontWeight: typography.weight.bold },
  tabs: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radii.pill, backgroundColor: colors.surfaceAlt },
  tabActive: { backgroundColor: colors.accent },
  tabText: { color: colors.textSecondary, fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
  tabTextActive: { color: colors.accentText },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  name: { color: colors.textPrimary, fontSize: typography.size.md, fontWeight: typography.weight.semibold },
  username: { color: colors.textMuted, fontSize: typography.size.xs },
});
