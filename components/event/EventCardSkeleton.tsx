import { StyleSheet, View } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors, radii, spacing } from '@/constants/theme';

export function EventCardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton style={styles.image} />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Skeleton style={styles.title} />
          <Skeleton style={styles.price} />
        </View>
        <Skeleton style={styles.lineSm} />
        <Skeleton style={[styles.lineXs, { width: '70%' }]} />
        <Skeleton style={[styles.lineXs, { width: '50%' }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  image: { width: '100%', height: 170, borderRadius: 0 },
  body: { padding: spacing.md, gap: spacing.sm },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  title: { height: 18, flex: 1 },
  price: { height: 18, width: 40 },
  lineSm: { height: 12, width: '55%' },
  lineXs: { height: 10 },
});
