import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { Message } from '@/types/models';

export function MessageBubble({
  message,
  isMine,
  onImagePress,
  onRetry,
  onDiscard,
  onLongPress,
}: {
  message: Message;
  isMine: boolean;
  onImagePress?: (uri: string) => void;
  onRetry?: () => void;
  onDiscard?: () => void;
  /** Mantener presionado sobre un mensaje ajeno abre la opción de denunciarlo. */
  onLongPress?: () => void;
}) {
  const time = new Date(message.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  const hasImage = Boolean(message.imageUrl);
  const isError = message.status === 'error';
  const isRejected = message.status === 'rejected';
  const isFailed = isError || isRejected;

  const content = (
    <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs, hasImage && styles.bubbleImage, isFailed && styles.bubbleError]}>
      {hasImage && (
        <Pressable onPress={() => message.imageUrl && onImagePress?.(message.imageUrl)} disabled={!message.imageUrl}>
          <Image source={{ uri: message.imageUrl! }} style={styles.image} contentFit="cover" />
        </Pressable>
      )}
      {message.body ? <Text style={[styles.body, isMine && styles.bodyMine, hasImage && styles.bodyWithImage]}>{message.body}</Text> : null}
    </View>
  );

  return (
    <View style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}>
      {isError ? (
        <Pressable onPress={onRetry}>{content}</Pressable>
      ) : onLongPress ? (
        <Pressable onLongPress={onLongPress} delayLongPress={350} accessibilityHint="Mantené presionado para denunciar este mensaje">
          {content}
        </Pressable>
      ) : (
        content
      )}
      {/* Un mensaje rechazado por el filtro no se reintenta: repetir el envío
          daría exactamente el mismo rechazo. Se explica el motivo y la única
          salida es descartarlo. */}
      {isRejected ? (
        <View style={styles.rejectedBox}>
          <Text style={styles.rejectedText}>{message.rejectedReason ?? 'Este mensaje va contra las normas de la comunidad.'}</Text>
          <Pressable onPress={onDiscard} hitSlop={6}>
            <Text style={styles.discardText}>Descartar</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.metaRow}>
          {isError ? (
            <Pressable style={styles.retryRow} onPress={onRetry} hitSlop={6}>
              <Ionicons name="alert-circle" size={12} color={colors.danger} />
              <Text style={styles.retryText}>No se envió · Reintentar</Text>
            </Pressable>
          ) : (
            <>
              <Text style={styles.time}>{time}</Text>
              {isMine && <MessageStatusIcon status={message.status} />}
            </>
          )}
        </View>
      )}
    </View>
  );
}

function MessageStatusIcon({ status }: { status: Message['status'] }) {
  if (status === 'sending') return <ActivityIndicator size={9} color={colors.textMuted} style={styles.statusIcon} />;
  if (status === 'read') return <Ionicons name="checkmark-done" size={14} color={colors.accent} style={styles.statusIcon} />;
  return <Ionicons name="checkmark" size={14} color={colors.textMuted} style={styles.statusIcon} />;
}

const styles = StyleSheet.create({
  row: { maxWidth: '78%', marginVertical: 3 },
  rowMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  rowTheirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  bubbleMine: { backgroundColor: colors.accent, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.surfaceAlt, borderBottomLeftRadius: 4 },
  bubbleImage: { padding: 4, overflow: 'hidden' },
  bubbleError: { opacity: 0.6 },
  image: { width: 200, height: 200, borderRadius: radii.md },
  body: { color: colors.textPrimary, fontSize: typography.size.md, lineHeight: 20 },
  bodyMine: { color: colors.accentText },
  bodyWithImage: { marginTop: spacing.xs, marginHorizontal: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, marginHorizontal: 4 },
  time: { color: colors.textMuted, fontSize: 10 },
  statusIcon: { marginLeft: 2 },
  retryRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  retryText: { color: colors.danger, fontSize: 10, fontWeight: typography.weight.medium },
  rejectedBox: {
    marginTop: 4,
    marginHorizontal: 4,
    gap: 4,
    alignItems: 'flex-end',
    borderRightWidth: 2,
    borderRightColor: colors.danger,
    paddingRight: spacing.xs,
  },
  rejectedText: { color: colors.danger, fontSize: 11, lineHeight: 15, textAlign: 'right' },
  discardText: { color: colors.textSecondary, fontSize: 11, fontWeight: typography.weight.semibold, textDecorationLine: 'underline' },
});
