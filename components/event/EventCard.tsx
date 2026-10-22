import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { EventSummary } from '@/types/models';
import { formatDistance, formatEventDateTime } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';

type Props = {
  event: EventSummary;
  saved?: boolean;
  onPress: () => void;
  onToggleSave: () => void;
};

export function EventCard({ event, saved = false, onPress, onToggleSave }: Props) {
  const spotsLabel =
    event.spotsLeft !== null
      ? event.spotsLeft <= 0
        ? 'Sin plazas'
        : event.spotsLeft <= 5
          ? `Últimas ${event.spotsLeft} plazas`
          : `${event.spotsLeft} plazas libres`
      : null;

  return (
    <Animated.View entering={FadeIn.duration(220)}>
      <Pressable onPress={onPress} style={styles.card} accessibilityRole="button">
        <View style={styles.imageWrapper}>
          {event.coverImageUrl ? (
            <Image source={{ uri: event.coverImageUrl }} style={styles.image} contentFit="cover" transition={200} />
          ) : (
            <View style={[styles.image, styles.imageFallback]} />
          )}

          <Pressable onPress={onToggleSave} hitSlop={10} style={styles.saveButton} accessibilityLabel="Guardar fiesta">
            <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={18} color={colors.white} />
          </Pressable>

          <View style={styles.badgeRow}>
            {event.status === 'full' && <Badge label="Completo" tone="warning" />}
            {spotsLabel && event.status !== 'full' && <Badge label={spotsLabel} tone="accent" />}
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {event.title}
            </Text>
            {event.isFree ? (
              <Text style={styles.price}>Gratis</Text>
            ) : event.priceCents ? (
              <Text style={styles.price}>${(event.priceCents / 100).toFixed(0)}</Text>
            ) : null}
          </View>

          <Text style={styles.organizer} numberOfLines={1}>
            por @{event.organizer.username}
            {event.organizer.isOrganizerVerified ? ' · verificado' : ''}
          </Text>

          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color={colors.textMuted} />
            <Text style={styles.metaText} numberOfLines={1}>
              {event.neighborhood ?? event.city ?? 'Zona reservada'}
              {event.distanceMeters != null ? ` · ${formatDistance(event.distanceMeters)}` : ''}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
            <Text style={styles.metaText}>{formatEventDateTime(event.startsAt)}</Text>
          </View>

          <View style={styles.footerRow}>
            <View style={styles.confirmedPill}>
              <Ionicons name="people-outline" size={13} color={colors.textSecondary} />
              <Text style={styles.confirmedText}>{event.confirmedCount} confirmados</Text>
            </View>
            {event.accessMode === 'request' && <Badge label="Requiere aprobación" tone="neutral" />}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  imageWrapper: {
    width: '100%',
    height: 170,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    backgroundColor: colors.surfaceRaised,
  },
  saveButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.overlay,
    padding: spacing.xs,
    borderRadius: radii.pill,
  },
  badgeRow: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    gap: spacing.xxs,
  },
  body: {
    padding: spacing.md,
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
  },
  price: {
    color: colors.accent,
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
  },
  organizer: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: colors.textMuted,
    fontSize: typography.size.xs,
    flexShrink: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  confirmedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  confirmedText: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
  },
});
