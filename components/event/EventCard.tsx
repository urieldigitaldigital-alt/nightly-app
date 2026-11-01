import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { motion } from '@/constants/motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { EventSummary } from '@/types/models';
import { formatDistance, formatEventDateTime } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';

type Props = {
  event: EventSummary;
  onPress: () => void;
  /** Position in the list — staggers the entrance animation so cards cascade
   * in instead of popping together, capped so a long list's bottom items
   * don't wait seconds to appear. */
  index?: number;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function EventCard({ event, onPress, index = 0 }: Props) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const delay = Math.min(index, motion.staggerCap) * motion.staggerStep;

  const spotsLabel =
    event.spotsLeft !== null
      ? event.spotsLeft <= 0
        ? 'Sin plazas'
        : event.spotsLeft <= 5
          ? `Últimas ${event.spotsLeft} plazas`
          : `${event.spotsLeft} plazas libres`
      : null;

  return (
    <Animated.View entering={reducedMotion ? undefined : FadeInDown.duration(280).delay(delay).easing(motion.moveEasing)}>
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => {
          if (!reducedMotion) scale.value = withTiming(motion.pressScale, { duration: motion.pressDuration, easing: motion.moveEasing });
        }}
        onPressOut={() => {
          scale.value = reducedMotion ? 1 : withSpring(1, motion.releaseSpring);
        }}
        style={[styles.card, cardStyle]}
        accessibilityRole="button">
        <View style={styles.imageWrapper}>
          {event.coverImageUrl ? (
            <Image source={{ uri: event.coverImageUrl }} style={styles.image} contentFit="cover" transition={200} />
          ) : (
            <View style={[styles.image, styles.imageFallback]} />
          )}

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
      </AnimatedPressable>
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
