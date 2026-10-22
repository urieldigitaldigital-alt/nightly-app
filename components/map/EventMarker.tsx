import { StyleSheet, Text, View } from 'react-native';
import { Marker } from '@/components/map/PlatformMap';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '@/constants/theme';
import { MarkerCluster } from '@/lib/clustering';

const PIN_SIZE = 48;

export function EventMarkerPin({ cluster, onPress }: { cluster: MarkerCluster; onPress: () => void }) {
  const primary = cluster.events[0];
  const count = cluster.events.length;

  return (
    <Marker
      coordinate={{ latitude: cluster.lat, longitude: cluster.lng }}
      onPress={onPress}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 1 }}
    >
      <View style={styles.wrapper}>
        <View style={styles.circle}>
          {primary.coverImageUrl ? (
            <Image source={{ uri: primary.coverImageUrl }} style={styles.photo} contentFit="cover" />
          ) : (
            <View style={[styles.photo, styles.photoFallback]}>
              <Ionicons name="musical-notes" size={18} color={colors.textMuted} />
            </View>
          )}
        </View>
        {count > 1 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{count}</Text>
          </View>
        )}
        <View style={styles.pointer} />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  circle: {
    width: PIN_SIZE,
    height: PIN_SIZE,
    borderRadius: PIN_SIZE / 2,
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: colors.white,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: (PIN_SIZE - 6) / 2,
  },
  photoFallback: {
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointer: {
    width: 10,
    height: 10,
    backgroundColor: colors.white,
    transform: [{ rotate: '45deg' }, { translateY: -7 }],
    marginTop: -2,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.white,
  },
  badgeText: {
    color: colors.accentText,
    fontSize: 11,
    fontWeight: typography.weight.bold,
  },
});
