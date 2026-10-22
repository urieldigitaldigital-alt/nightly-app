import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { colors, spacing, typography } from '@/constants/theme';
import { fetchAttendees } from '@/services/attendees';

export default function AttendeesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading } = useQuery({ queryKey: ['attendees', id], queryFn: () => fetchAttendees(id), enabled: Boolean(id) });

  return (
    <Screen edges={['top', 'bottom']} padded>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Asistentes confirmados</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <LoadingState />
      ) : !data || data.length === 0 ? (
        <EmptyState title="Nadie confirmado todavía" description="Los asistentes aceptados van a aparecer acá." />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(a) => a.id}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => router.push(`/profile/${item.profile.username}`)}>
              <Avatar uri={item.profile.avatarUrl} name={item.profile.displayName} size={40} />
              <View>
                <Text style={styles.name}>{item.profile.displayName}</Text>
                <Text style={styles.username}>@{item.profile.username}</Text>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { color: colors.textPrimary, fontSize: typography.size.md, fontWeight: typography.weight.semibold },
  username: { color: colors.textMuted, fontSize: typography.size.xs },
});
