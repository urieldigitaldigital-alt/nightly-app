import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { accentGradient, colors, radii, shadows, spacing, typography } from '@/constants/theme';
import { formatDistance } from '@/lib/format';
import { instagramUrl } from '@/lib/instagram';
import { Venue } from '@/types/models';
import { PressableScale } from '@/components/ui/PressableScale';
import { VenueLogo } from './VenueLogo';

type Props = {
  venue: Venue;
  onClose: () => void;
};

/**
 * Ficha del boliche elegido en el mapa.
 *
 * Se abre sobre el mapa y no como pantalla aparte: el sentido de tocar un
 * marcador es ver de qué lugar se trata sin perder de vista dónde está
 * parado el resto.
 */
export function VenueSheet({ venue, onClose }: Props) {
  const igUrl = instagramUrl(venue.instagram);

  const openInstagram = () => {
    if (igUrl) Linking.openURL(igUrl).catch(() => {});
  };

  const openDirections = () => {
    // Apple Maps en iOS y Google Maps en el resto. `maps.apple.com` en
    // Android abre una página web que no sirve para navegar, y el esquema
    // `geo:` no existe en iOS.
    const label = encodeURIComponent(venue.name);
    const url =
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?daddr=${venue.lat},${venue.lng}&q=${label}`
        : `https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={styles.root}>
      <View style={styles.grabber} />

      <View style={styles.head}>
        <VenueLogo uri={venue.logoUrl} name={venue.name} size={58} ring />

        <View style={styles.headText}>
          <Text style={styles.name} numberOfLines={1}>
            {venue.name}
          </Text>
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.address} numberOfLines={1}>
              {venue.address ?? venue.city}
            </Text>
          </View>
          {venue.distanceMeters != null ? (
            <Text style={styles.distance}>a {formatDistance(venue.distanceMeters)}</Text>
          ) : null}
        </View>

        <PressableScale
          style={styles.close}
          scaleTo={0.9}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
        >
          <Ionicons name="close" size={18} color={colors.textSecondary} />
        </PressableScale>
      </View>

      {venue.description ? (
        <Text style={styles.description} numberOfLines={3}>
          {venue.description}
        </Text>
      ) : null}

      <View style={styles.actions}>
        {igUrl ? (
          <PressableScale
            style={styles.primaryAction}
            scaleTo={0.97}
            onPress={openInstagram}
            accessibilityRole="link"
            accessibilityLabel={`Abrir el Instagram de ${venue.name}`}
          >
            <LinearGradient
              colors={[...accentGradient]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryFill}
            >
              <Ionicons name="logo-instagram" size={18} color={colors.accentText} />
              <Text style={styles.primaryLabel}>Instagram</Text>
            </LinearGradient>
          </PressableScale>
        ) : (
          // Se muestra deshabilitado en vez de ocultarlo: así la fila de
          // botones no cambia de ancho según el boliche, que de un marcador
          // al siguiente se ve como si la ficha se rearmara sola.
          <View style={[styles.secondaryAction, styles.disabledAction]}>
            <Text style={styles.disabledLabel}>Sin Instagram</Text>
          </View>
        )}

        <PressableScale
          style={styles.secondaryAction}
          scaleTo={0.97}
          onPress={openDirections}
          accessibilityRole="button"
          accessibilityLabel={`Cómo llegar a ${venue.name}`}
        >
          <Ionicons name="navigate-outline" size={18} color={colors.textPrimary} />
          <Text style={styles.secondaryLabel}>Cómo llegar</Text>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: 'rgba(11,16,21,0.96)',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.card,
  },
  grabber: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.16)',
    marginBottom: spacing.xs,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  headText: { flex: 1, minWidth: 0 },
  name: {
    color: colors.textPrimary,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
  },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  address: { flex: 1, color: colors.textSecondary, fontSize: typography.size.sm },
  distance: {
    color: colors.accent,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    marginTop: 3,
  },
  close: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
    lineHeight: 19,
  },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xxs },
  primaryAction: { flex: 1, height: 48, borderRadius: radii.pill, ...shadows.glow },
  primaryFill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radii.pill,
  },
  primaryLabel: {
    color: colors.accentText,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },
  secondaryAction: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryLabel: {
    color: colors.textPrimary,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },
  disabledAction: { opacity: 0.5 },
  disabledLabel: { color: colors.textMuted, fontSize: typography.size.sm },
});
