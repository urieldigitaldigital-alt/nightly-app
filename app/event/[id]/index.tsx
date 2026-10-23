import { useState } from 'react';
import { FlatList, Modal, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useEventDetail } from '@/hooks/useEventDetail';
import { useAuthStore } from '@/stores/authStore';
import { useToggleSaveEvent } from '@/hooks/useSavedEvents';
import { requestEventAccess, cancelAttendance } from '@/services/requests';
import { cancelEvent } from '@/services/events';
import { uploadDniPhoto } from '@/services/storage';
import { formatEventDateTime, formatPrice } from '@/lib/format';

const REQUEST_STATUS_COPY: Record<string, { label: string; tone: 'accent' | 'neutral' | 'warning' | 'danger' }> = {
  pending: { label: 'Solicitud enviada — esperando al organizador', tone: 'warning' },
  accepted: { label: 'Estás confirmado para esta fiesta', tone: 'accent' },
  rejected: { label: 'Tu solicitud no fue aceptada', tone: 'danger' },
  waitlisted: { label: 'Estás en lista de espera', tone: 'neutral' },
  cancelled: { label: 'Cancelaste tu asistencia', tone: 'neutral' },
};

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  const session = useAuthStore((s) => s.session);
  const { data: event, isLoading, isError, refetch } = useEventDetail(id);
  const toggleSave = useToggleSaveEvent();
  const [requesting, setRequesting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showDniModal, setShowDniModal] = useState(false);
  const [dniPhotoUri, setDniPhotoUri] = useState<string | null>(null);
  const [dniError, setDniError] = useState<string | null>(null);

  if (isLoading) return <LoadingState fullscreen />;
  if (isError || !event) {
    return (
      <Screen padded>
        <EmptyState title="No encontramos esta fiesta" description="Puede que haya sido cancelada o que el link esté roto." actionLabel="Volver" onAction={() => router.back()} />
      </Screen>
    );
  }

  const isOrganizer = profile?.id === event.organizer.id;
  const spotsLabel =
    event.spotsLeft !== null ? (event.spotsLeft <= 0 ? 'Sin plazas disponibles' : `${event.spotsLeft} plazas disponibles`) : 'Sin límite de plazas';

  const invalidateEvent = () => {
    queryClient.invalidateQueries({ queryKey: ['event-detail', id] });
    queryClient.invalidateQueries({ queryKey: ['events-feed'] });
  };

  const openDniModal = () => {
    setDniError(null);
    setDniPhotoUri(null);
    setShowDniModal(true);
  };

  const handlePickDniPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) setDniPhotoUri(result.assets[0].uri);
  };

  const handleSubmitRequestWithDni = async () => {
    if (!dniPhotoUri || !session) return;
    setRequesting(true);
    setDniError(null);
    try {
      const dniPhotoPath = await uploadDniPhoto(session.user.id, event.id, dniPhotoUri);
      await requestEventAccess(event.id, undefined, dniPhotoPath);
      setShowDniModal(false);
      invalidateEvent();
    } catch (e: any) {
      setDniError(translateRequestError(e?.message));
    } finally {
      setRequesting(false);
    }
  };

  const handleCancelAttendance = async () => {
    setRequesting(true);
    try {
      await cancelAttendance(event.id);
      invalidateEvent();
    } finally {
      setRequesting(false);
    }
  };

  const handleCancelEvent = async () => {
    setRequesting(true);
    try {
      await cancelEvent(event.id);
      invalidateEvent();
    } finally {
      setRequesting(false);
    }
  };

  const statusCopy = event.myRequestStatus ? REQUEST_STATUS_COPY[event.myRequestStatus] : null;
  const canRequest = !isOrganizer && event.status === 'published' && !event.myRequestStatus;

  return (
    <Screen edges={['bottom']}>
      <FlatList
        data={event.images.length > 0 ? event.images : event.coverImageUrl ? [{ id: 'cover', url: event.coverImageUrl, sortOrder: 0 }] : []}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(img) => img.id}
        style={styles.gallery}
        renderItem={({ item }) => <Image source={{ uri: item.url }} style={styles.galleryImage} contentFit="cover" />}
        ListEmptyComponent={<View style={[styles.galleryImage, styles.galleryFallback]} />}
        ListHeaderComponent={undefined}
      />

      <View style={styles.topBar}>
        <Pressable style={styles.topBarButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.white} />
        </Pressable>
        <View style={styles.topBarRight}>
          <Pressable
            style={styles.topBarButton}
            onPress={() => Share.share({ message: `Mirá esta fiesta en NIGHTLY: ${event.title}` })}
          >
            <Ionicons name="share-outline" size={20} color={colors.white} />
          </Pressable>
          <Pressable style={styles.topBarButton} onPress={() => toggleSave.mutate({ eventId: event.id, nextSaved: !event.isSaved })}>
            <Ionicons name={event.isSaved ? 'bookmark' : 'bookmark-outline'} size={20} color={colors.white} />
          </Pressable>
          {!isOrganizer && (
            <Pressable
              style={styles.topBarButton}
              onPress={() => router.push({ pathname: '/report', params: { targetType: 'event', targetId: event.id } })}
            >
              <Ionicons name="flag-outline" size={20} color={colors.white} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.price}>{formatPrice(event.priceCents, event.isFree)}</Text>
        </View>

        <View style={styles.organizerRow}>
          <Text style={styles.organizer}>
            Organiza @{event.organizer.username}
            {event.organizer.isOrganizerVerified ? ' · verificado' : ''}
          </Text>
        </View>

        <View style={styles.badgeRow}>
          <Badge label={spotsLabel} tone={event.spotsLeft === 0 ? 'danger' : 'accent'} />
          <Badge label={`${event.confirmedCount} confirmados`} tone="neutral" />
          {event.accessMode === 'request' && <Badge label="Requiere aprobación" tone="neutral" />}
          {event.accessMode === 'invite_only' && <Badge label="Solo invitados" tone="neutral" />}
          {event.accessMode === 'open' && <Badge label="Acceso abierto" tone="accent" />}
        </View>

        <View style={styles.metaBlock}>
          <MetaRow icon="calendar-outline" text={formatEventDateTime(event.startsAt)} />
          <MetaRow icon="location-outline" text={event.neighborhood ?? event.city ?? 'Zona reservada'} />
          {event.minAge ? <MetaRow icon="alert-circle-outline" text={`+${event.minAge} años`} /> : null}
        </View>

        <Text style={styles.sectionTitle}>Descripción</Text>
        <Text style={styles.description}>{event.description}</Text>

        {event.rules ? (
          <>
            <Text style={styles.sectionTitle}>Reglas del evento</Text>
            <Text style={styles.description}>{event.rules}</Text>
          </>
        ) : null}

        {event.exactAddress ? (
          <View style={styles.addressBox}>
            <Ionicons name="navigate-circle" size={20} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={styles.addressLabel}>Dirección confirmada</Text>
              <Text style={styles.addressText}>{event.exactAddress}</Text>
            </View>
          </View>
        ) : null}

        {statusCopy ? <Badge label={statusCopy.label} tone={statusCopy.tone} /> : null}
        {actionError ? <Text style={styles.error}>{actionError}</Text> : null}

        <View style={styles.actions}>
          {isOrganizer ? (
            <>
              <Button label="Gestionar solicitudes" onPress={() => router.push(`/event/${event.id}/requests`)} />
              <Button label="Verificar entrada" variant="secondary" onPress={() => router.push(`/event/${event.id}/checkin`)} />
              <Button label="Ver asistentes" variant="secondary" onPress={() => router.push(`/event/${event.id}/attendees`)} />
              <Button label="Editar fiesta" variant="outline" onPress={() => router.push(`/event/${event.id}/edit`)} />
              {event.status !== 'cancelled' && event.status !== 'finished' && (
                <Button label="Cancelar fiesta" variant="danger" onPress={handleCancelEvent} loading={requesting} />
              )}
            </>
          ) : (
            <>
              {canRequest && (
                <Button
                  label={event.accessMode === 'open' ? 'Unirme' : 'Solicitar acceso'}
                  onPress={openDniModal}
                  loading={requesting}
                />
              )}
              {event.myRequestStatus === 'accepted' && (
                <>
                  {event.myEntryCode ? (
                    <View style={styles.entryCodeBox}>
                      <Text style={styles.entryCodeLabel}>Tu código de entrada</Text>
                      <Text style={styles.entryCodeValue}>{event.myEntryCode}</Text>
                      <Text style={styles.entryCodeHint}>Mostraselo al organizador en la puerta.</Text>
                    </View>
                  ) : null}
                  <Button label="Cómo llegar" onPress={() => router.push(`/event/${event.id}/directions`)} />
                  <Button label="Cancelar asistencia" variant="outline" onPress={handleCancelAttendance} loading={requesting} />
                </>
              )}
              {(event.myRequestStatus === 'pending' || event.myRequestStatus === 'waitlisted') && (
                <Button label="Cancelar solicitud" variant="outline" onPress={handleCancelAttendance} loading={requesting} />
              )}
            </>
          )}
        </View>
      </View>

      <Modal visible={showDniModal} transparent animationType="slide" onRequestClose={() => setShowDniModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Subí una foto de tu DNI</Text>
            <Text style={styles.modalBody}>
              Solo la ve el organizador para confirmar que sos vos, y se borra automáticamente a los pocos días de
              terminada la fiesta.
            </Text>

            <Pressable style={styles.dniPicker} onPress={handlePickDniPhoto}>
              {dniPhotoUri ? (
                <Image source={{ uri: dniPhotoUri }} style={styles.dniPreview} contentFit="cover" />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={28} color={colors.textMuted} />
                  <Text style={styles.dniPickerText}>Elegir foto</Text>
                </>
              )}
            </Pressable>

            {dniError ? <Text style={styles.error}>{dniError}</Text> : null}

            <Button label="Enviar solicitud" onPress={handleSubmitRequestWithDni} loading={requesting} disabled={!dniPhotoUri} />
            <Button label="Cancelar" variant="outline" onPress={() => setShowDniModal(false)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function MetaRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.metaRow}>
      <Ionicons name={icon} size={16} color={colors.textMuted} />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

function translateRequestError(message?: string): string {
  if (!message) return 'No pudimos enviar tu solicitud. Probá de nuevo.';
  if (message.includes('ALREADY_REQUESTED')) return 'Ya tenés una solicitud para esta fiesta.';
  if (message.includes('DEADLINE_PASSED')) return 'Se venció el plazo para solicitar acceso.';
  if (message.includes('BLOCKED')) return 'No podés solicitar acceso a este evento.';
  if (message.includes('INVITE_ONLY')) return 'Esta fiesta es solo por invitación.';
  if (message.includes('EVENT_NOT_AVAILABLE')) return 'Esta fiesta ya no está disponible.';
  if (message.includes('DNI_REQUIRED')) return 'Subí una foto de tu DNI para poder solicitar acceso.';
  return message;
}

const styles = StyleSheet.create({
  gallery: { height: 260 },
  galleryImage: { width: 390, height: 260 },
  galleryFallback: { backgroundColor: colors.surfaceRaised, width: '100%' },
  topBar: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  topBarRight: { flexDirection: 'row', gap: spacing.xs },
  topBarButton: { backgroundColor: colors.overlay, padding: spacing.xs, borderRadius: radii.pill },
  body: { padding: spacing.lg, gap: spacing.sm },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { flex: 1, color: colors.textPrimary, fontSize: typography.size.xxl, fontWeight: typography.weight.bold },
  price: { color: colors.accent, fontSize: typography.size.lg, fontWeight: typography.weight.bold },
  organizerRow: {},
  organizer: { color: colors.textSecondary, fontSize: typography.size.sm },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginVertical: spacing.xs },
  metaBlock: { gap: spacing.xs, marginBottom: spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaText: { color: colors.textSecondary, fontSize: typography.size.sm },
  sectionTitle: { color: colors.textPrimary, fontSize: typography.size.lg, fontWeight: typography.weight.semibold, marginTop: spacing.sm },
  description: { color: colors.textSecondary, fontSize: typography.size.md, lineHeight: 22, marginTop: spacing.xxs },
  addressBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  addressLabel: { color: colors.textMuted, fontSize: typography.size.xs },
  addressText: { color: colors.textPrimary, fontSize: typography.size.md, fontWeight: typography.weight.medium },
  error: { color: colors.danger, fontSize: typography.size.sm },
  actions: { gap: spacing.sm, marginTop: spacing.lg },
  entryCodeBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xxs,
  },
  entryCodeLabel: { color: colors.textSecondary, fontSize: typography.size.sm },
  entryCodeValue: { color: colors.accent, fontSize: typography.size.xxl, fontWeight: typography.weight.bold, letterSpacing: 2 },
  entryCodeHint: { color: colors.textMuted, fontSize: typography.size.xs },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalTitle: { color: colors.textPrimary, fontSize: typography.size.lg, fontWeight: typography.weight.bold },
  modalBody: { color: colors.textSecondary, fontSize: typography.size.sm, lineHeight: 20 },
  dniPicker: {
    height: 160,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    overflow: 'hidden',
  },
  dniPreview: { width: '100%', height: '100%' },
  dniPickerText: { color: colors.textMuted, fontSize: typography.size.sm },
});
