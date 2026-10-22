import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { colors, spacing, typography } from '@/constants/theme';
import { listFollowers, listFollowing } from '@/services/follows';
import { searchProfiles } from '@/services/search';
import { useAuthStore } from '@/stores/authStore';

type Tab = 'following' | 'followers' | 'find';

export default function FriendsScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const [tab, setTab] = useState<Tab>('following');
  const [query, setQuery] = useState('');

  const following = useQuery({ queryKey: ['following', profile?.id], queryFn: () => listFollowing(profile!.id), enabled: Boolean(profile?.id) && tab === 'following' });
  const followers = useQuery({ queryKey: ['followers', profile?.id], queryFn: () => listFollowers(profile!.id), enabled: Boolean(profile?.id) && tab === 'followers' });
  const search = useQuery({ queryKey: ['profile-search', query], queryFn: () => searchProfiles(query), enabled: tab === 'find' && query.length > 1 });

  const data = tab === 'following' ? following.data : tab === 'followers' ? followers.data : search.data;
  const loading = tab === 'following' ? following.isLoading : tab === 'followers' ? followers.isLoading : search.isLoading;

  return (
    <Screen edges={['top', 'bottom']} padded>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Amigos</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabs}>
        {(['following', 'followers', 'find'] as Tab[]).map((t) => (
          <Pressable key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>
              {t === 'following' ? 'Siguiendo' : t === 'followers' ? 'Seguidores' : 'Buscar'}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'find' && (
        <Input placeholder="Buscar por usuario o nombre..." value={query} onChangeText={setQuery} autoCapitalize="none" />
      )}

      {loading ? (
        <LoadingState />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title={tab === 'find' ? 'Buscá a alguien' : tab === 'following' ? 'No seguís a nadie todavía' : 'Todavía sin seguidores'}
          description={tab === 'find' ? 'Escribí un usuario o nombre para encontrar gente.' : undefined}
        />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(p: any) => p.id}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item }: any) => (
            <Pressable style={styles.row} onPress={() => router.push(`/profile/${item.username}`)}>
              <Avatar uri={item.avatar_url} name={item.display_name} size={44} />
              <View>
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
  title: { color: colors.textPrimary, fontSize: typography.size.xl, fontWeight: typography.weight.bold },
  tabs: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  tab: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: 999, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  tabLabel: { color: colors.textSecondary, fontSize: typography.size.sm, fontWeight: typography.weight.medium },
  tabLabelActive: { color: colors.accentText, fontWeight: typography.weight.semibold },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { color: colors.textPrimary, fontSize: typography.size.md, fontWeight: typography.weight.semibold },
  username: { color: colors.textMuted, fontSize: typography.size.xs },
});
