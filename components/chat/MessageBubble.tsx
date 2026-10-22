import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { Message } from '@/types/models';

export function MessageBubble({ message, isMine }: { message: Message; isMine: boolean }) {
  const time = new Date(message.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={[styles.body, isMine && styles.bodyMine]}>{message.body}</Text>
      </View>
      <Text style={styles.time}>{time}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { maxWidth: '78%', marginVertical: 3 },
  rowMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  rowTheirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  bubbleMine: { backgroundColor: colors.accent, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.surfaceAlt, borderBottomLeftRadius: 4 },
  body: { color: colors.textPrimary, fontSize: typography.size.md, lineHeight: 20 },
  bodyMine: { color: colors.accentText },
  time: { color: colors.textMuted, fontSize: 10, marginTop: 2, marginHorizontal: 4 },
});
