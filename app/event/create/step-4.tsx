import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { WizardHeader } from '@/components/event/WizardHeader';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useCreateEventStore } from '@/stores/createEventStore';
import { createEvent } from '@/services/events';
import { uploadEventImage } from '@/services/storage';
import { supabase } from '@/lib/supabase';
import { formatEventDateTime, formatPrice } from '@/lib/format';

export default function CreateEventStep4() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { draft, reset } = useCreateEventStore();
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePublish = async () => {
    if (!confirmed) {
      setError('Tenés que confirmar que estás autorizado a organizar este evento en ese lugar.');
      return;
    }
    if (!draft.categorySlug || !draft.venueType || !draft.startsAt || draft.exactLat == null || draft.exactLng == null) {
      setError('Faltan datos del evento. Volvé a los pasos anteriores.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const event = await createEvent({
        categorySlug: draft.categorySlug,
        title: draft.title,
        description: draft.description,
        venueType: draft.venueType,
        city: draft.city,
        neighborhood: draft.neighborhood || null,
        exactLat: draft.exactLat,
        exactLng: draft.exactLng,
        exactAddress: draft.exactAddress,
        startsAt: draft.startsAt.toISOString(),
        endsAt: draft.endsAt ? draft.endsAt.toISOString() : null,
        minAge: draft.minAge ? Number(draft.minAge) : null,
        rules: draft.rules || null,
        capacity: draft.capacity ? Number(draft.capacity) : null,
        accessMode: draft.accessMode,
        isFree: draft.isFree,
        priceCents: draft.isFree ? null : Number(draft.priceCents),
        requestDeadline: draft.requestDeadline ? draft.requestDeadline.toISOString() : null,
        coverImageUrl: null,
        organizerConfirmedAuthorization: true,
      });

      if (draft.coverPhotoUri) {
        const url = await uploadEventImage(event.id, draft.coverPhotoUri, 0);
        await supabase.from('events').update({ cover_image_url: url }).eq('id', event.id);
        await supabase.from('event_images').insert({ event_id: event.id, url, sort_order: 0 });
      }

      queryClient.invalidateQueries({ queryKey: ['my-events'] });
      queryClient.invalidateQueries({ queryKey: ['events-feed'] });
      reset();
      router.replace(`/event/${event.id}`);
    } catch (e: any) {
      setError(translatePublishError(e?.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']} padded>
      <WizardHeader step={4} totalSteps={4} title="Revisá y publicá" />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.previewCard}>
          {draft.coverPhotoUri ? (
            <Image source={{ uri: draft.coverPhotoUri }} style={styles.cover} contentFit="cover" />
          ) : (
            <View style={[styles.cover, styles.coverFallback]} />
          )}
          <View style={styles.previewBody}>
            <Text style={styles.title}>{draft.title || 'Sin título'}</Text>
            <Text style={styles.meta}>{draft.startsAt ? formatEventDateTime(draft.startsAt.toISOString()) : '—'}</Text>
            <Text style={styles.meta}>
              {draft.neighborhood || draft.city} · {draft.venueType}
            </Text>
            <Text style={styles.meta}>
              {draft.isFree ? 'Gratis' : formatPrice(Number(draft.priceCents) || 0, false)} ·{' '}
              {draft.capacity ? `${draft.capacity} lugares` : 'Sin límite de lugares'}
            </Text>
            <Text style={styles.description}>{draft.description}</Text>
          </View>
        </View>

        <Pressable style={styles.confirmRow} onPress={() => setConfirmed((v) => !v)}>
          <Ionicons name={confirmed ? 'checkbox' : 'square-outline'} size={22} color={confirmed ? colors.accent : colors.textMuted} />
          <Text style={styles.confirmText}>
            Confirmo que estoy autorizado a organizar este evento en este lugar y que cumplo las reglas de convivencia de NIGHTLY.
          </Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label="Publicar fiesta" onPress={handlePublish} loading={loading} />
      </ScrollView>
    </Screen>
  );
}

function translatePublishError(message?: string): string {
  if (!message) return 'No pudimos publicar la fiesta. Probá de nuevo.';
  if (message.includes('UNKNOWN_CATEGORY')) return 'La categoría elegida ya no está disponible.';
  if (message.includes('AUTHORIZATION_NOT_CONFIRMED')) return 'Tenés que confirmar la autorización del lugar.';
  return message;
}

const styles = StyleSheet.create({
  previewCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  cover: { width: '100%', height: 160 },
  coverFallback: { backgroundColor: colors.surfaceRaised },
  previewBody: { padding: spacing.md, gap: 4 },
  title: { color: colors.textPrimary, fontSize: typography.size.xl, fontWeight: typography.weight.bold },
  meta: { color: colors.textSecondary, fontSize: typography.size.sm },
  description: { color: colors.textSecondary, fontSize: typography.size.sm, marginTop: spacing.xs, lineHeight: 20 },
  confirmRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', marginBottom: spacing.lg },
  confirmText: { flex: 1, color: colors.textSecondary, fontSize: typography.size.sm, lineHeight: 19 },
  error: { color: colors.danger, fontSize: typography.size.sm, marginBottom: spacing.sm },
});
