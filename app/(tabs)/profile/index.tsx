import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import { signOut } from '@/services/auth';

const MENU_ITEMS: { icon: keyof typeof Ionicons.glyphMap; label: string; href: string }[] = [
  { icon: 'bookmark-outline', label: 'Guardados', href: '/saved' },
  { icon: 'calendar-outline', label: 'Mis planes', href: '/my-plans' },
  { icon: 'sparkles-outline', label: 'Mis fiestas', href: '/my-events' },
  { icon: 'people-outline', label: 'Amigos', href: '/friends' },
  { icon: 'trending-up-outline', label: 'Tendencias', href: '/trending' },
  { icon: 'notifications-outline', label: 'Notificaciones', href: '/notifications' },
  { icon: 'shield-checkmark-outline', label: 'Privacidad y seguridad', href: '/settings/privacy' },
  { icon: 'settings-outline', label: 'Configuración', href: '/settings' },
  { icon: 'help-circle-outline', label: 'Centro de ayuda', href: '/settings/help' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);

  if (!profile) return null;

  return (
    <Screen edges={['top']} padded>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Avatar uri={profile.avatarUrl} name={profile.displayName} size={72} />
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{profile.displayName}</Text>
              {profile.isVerified && <Ionicons name="checkmark-circle" size={18} color={colors.accent} />}
            </View>
            <Text style={styles.username}>@{profile.username}</Text>
            {profile.city ? <Text style={styles.city}>{profile.city}</Text> : null}
          </View>
        </View>

        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

        <View style={styles.badges}>
          {profile.isOrganizerVerified && <Badge label="Organizador verificado" tone="accent" />}
          {profile.musicInterests.slice(0, 4).map((genre) => (
            <Badge key={genre} label={genre} tone="neutral" />
          ))}
        </View>

        <Pressable style={styles.editButton} onPress={() => router.push('/profile/edit')}>
          <Text style={styles.editButtonText}>Editar perfil</Text>
        </Pressable>

        <View style={styles.menu}>
          {MENU_ITEMS.map((item) => (
            <Pressable key={item.href} style={styles.menuRow} onPress={() => router.push(item.href as any)}>
              <View style={styles.menuRowLeft}>
                <Ionicons name={item.icon} size={20} color={colors.textSecondary} />
                <Text style={styles.menuLabel}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.signOut} onPress={() => signOut()}>
          <Text style={styles.signOutText}>Cerrar sesión</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  name: { color: colors.textPrimary, fontSize: typography.size.xl, fontWeight: typography.weight.bold },
  username: { color: colors.textSecondary, fontSize: typography.size.sm },
  city: { color: colors.textMuted, fontSize: typography.size.xs, marginTop: 2 },
  bio: { color: colors.textSecondary, fontSize: typography.size.sm, marginTop: spacing.md, lineHeight: 20 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  editButton: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  editButtonText: { color: colors.textPrimary, fontWeight: typography.weight.semibold },
  menu: { marginTop: spacing.xl, gap: spacing.xxs },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuRowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  menuLabel: { color: colors.textPrimary, fontSize: typography.size.md },
  signOut: { marginVertical: spacing.xl, alignItems: 'center' },
  signOutText: { color: colors.danger, fontSize: typography.size.md, fontWeight: typography.weight.semibold },
});
