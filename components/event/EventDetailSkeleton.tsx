import { StyleSheet, View } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors, spacing } from '@/constants/theme';

export function EventDetailSkeleton() {
  return (
    <View style={styles.root}>
      <Skeleton style={styles.gallery} />
      <View style={styles.body}>
        <Skeleton style={styles.title} />
        <Skeleton style={styles.line} />
        <View style={styles.badgeRow}>
          <Skeleton style={styles.badge} />
          <Skeleton style={styles.badge} />
        </View>
        <Skeleton style={[styles.line, { width: '90%' }]} />
        <Skeleton style={[styles.line, { width: '75%' }]} />
        <Skeleton style={[styles.line, { width: '60%' }]} />
        <Skeleton style={styles.button} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  gallery: { width: '100%', height: 260, borderRadius: 0 },
  body: { padding: spacing.lg, gap: spacing.md },
  title: { height: 26, width: '70%' },
  line: { height: 14, width: '100%' },
  badgeRow: { flexDirection: 'row', gap: spacing.xs },
  badge: { height: 24, width: 110, borderRadius: 999 },
  button: { height: 48, width: '100%', borderRadius: 999, marginTop: spacing.sm },
});
