import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { brand } from '@/constants/brand';
import { fetchNotificationPrefs, NotificationPrefs, updateNotificationPrefs } from '@/services/profiles';

const NOTIF_LABELS: Record<string, string> = {
  new_request: 'Nuevas solicitudes',
  request_accepted: 'Solicitudes aceptadas',
  request_rejected: 'Solicitudes rechazadas',
  new_message: 'Mensajes nuevos',
  event_invite: 'Invitaciones a fiestas',
  event_time_changed: 'Cambios de horario',
  event_location_changed: 'Cambios de ubicación',
  event_cancelled: 'Fiestas canceladas',
  event_upcoming: 'Recordatorios de eventos próximos',
  capacity_changed: 'Cambios de disponibilidad',
};

export default function SettingsScreen() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<NotificationPrefs>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchNotificationPrefs().then((p) => {
      setPrefs(p);
      setLoaded(true);
    });
  }, []);

  const toggle = async (key: string) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    await updateNotificationPrefs(next);
  };

  return (
    <Screen edges={['top', 'bottom']} padded>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Configuración</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Notificaciones</Text>
        <View style={styles.card}>
          {loaded &&
            Object.entries(NOTIF_LABELS).map(([key, label], i) => (
              <View key={key} style={[styles.row, i > 0 && styles.rowBorder]}>
                <Text style={styles.rowLabel}>{label}</Text>
                <Switch value={prefs[key] ?? true} onValueChange={() => toggle(key)} trackColor={{ false: colors.surfaceRaised, true: colors.accent }} />
              </View>
            ))}
        </View>

        <Text style={styles.sectionTitle}>Más</Text>
        <View style={styles.card}>
          <Pressable style={styles.row} onPress={() => router.push('/settings/privacy')}>
            <Text style={styles.rowLabel}>Privacidad y seguridad</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
          <Pressable style={[styles.row, styles.rowBorder]} onPress={() => router.push('/settings/help')}>
            <Text style={styles.rowLabel}>Centro de ayuda</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        <Text style={styles.version}>{brand.name} · v0.1.0</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  title: { color: colors.textPrimary, fontSize: typography.size.xl, fontWeight: typography.weight.bold },
  sectionTitle: { color: colors.textSecondary, fontSize: typography.size.sm, fontWeight: typography.weight.semibold, marginTop: spacing.lg, marginBottom: spacing.xs },
  card: { backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  rowLabel: { color: colors.textPrimary, fontSize: typography.size.md },
  version: { color: colors.textMuted, fontSize: typography.size.xs, textAlign: 'center', marginTop: spacing.xl },
});
