import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { searchEvents, searchProfiles } from '@/services/search';
import { formatEventDateTime } from '@/lib/format';

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const events = useQuery({ queryKey: ['search-events', query], queryFn: () => searchEvents(query), enabled: query.length > 1 });
  const profiles = useQuery({ queryKey: ['search-profiles', query], queryFn: () => searchProfiles(query), enabled: query.length > 1 });

  const isLoading = events.isLoading || profiles.isLoading;
  const hasResults = (events.data?.length ?? 0) > 0 || (profiles.data?.length ?? 0) > 0;

  return (
    <Screen edges={['top', 'bottom']} padded>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Input
          placeholder="Fiestas, zonas, organizadores..."
          value={query}
          onChangeText={setQuery}
          autoFocus
          style={{ flex: 1 }}
          leftIcon={<Ionicons name="search" size={18} color={colors.textMuted} />}
        />
      </View>

      {query.length <= 1 ? (
        <EmptyState icon={<Ionicons name="search" size={36} color={colors.textMuted} />} title="Buscá lo que quieras" description="Fiestas por nombre, zona o fecha, y organizadores por usuario." />
      ) : isLoading ? (
        <LoadingState />
      ) : !hasResults ? (
        <EmptyState title="Sin resultados" description={`No encontramos nada para "${query}".`} />
      ) : (
        <FlatList
          data={[
            ...(events.data?.length ? [{ type: 'header', key: 'h-events', label: 'Fiestas' }, ...events.data.map((e) => ({ type: 'event', ...e }))] : []),
            ...(profiles.data?.length ? [{ type: 'header', key: 'h-profiles', label: 'Organizadores' }, ...profiles.data.map((p) => ({ type: 'profile', ...p }))] : []),
          ]}
          keyExtractor={(item: any) => item.key ?? item.id}
          ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
          renderItem={({ item }: any) => {
            if (item.type === 'header') return <Text style={styles.sectionTitle}>{item.label}</Text>;
            if (item.type === 'event') {
              return (
                <Pressable style={styles.row} onPress={() => router.push(`/event/${item.id}`)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.rowMeta}>
                      {formatEventDateTime(item.starts_at)} · {item.neighborhood ?? item.city}
                    </Text>
                  </View>
                </Pressable>
              );
            }
            return (
              <Pressable style={styles.row} onPress={() => router.push(`/profile/${item.username}`)}>
                <Avatar uri={item.avatar_url} name={item.display_name} size={36} />
                <View>
                  <Text style={styles.rowTitle}>{item.display_name}</Text>
                  <Text style={styles.rowMeta}>@{item.username}</Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  sectionTitle: { color: colors.textSecondary, fontSize: typography.size.sm, fontWeight: typography.weight.semibold, marginTop: spacing.sm, marginBottom: spacing.xxs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  rowTitle: { color: colors.textPrimary, fontSize: typography.size.md, fontWeight: typography.weight.semibold },
  rowMeta: { color: colors.textMuted, fontSize: typography.size.xs, marginTop: 2 },
});
