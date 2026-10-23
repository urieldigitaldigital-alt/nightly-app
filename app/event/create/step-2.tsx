import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import AppMap from '@/components/map/AppMap';
import type { MapMarkerSpec } from '@/components/map/AppMap.types';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CategoryChip } from '@/components/ui/CategoryChip';
import { WizardHeader } from '@/components/event/WizardHeader';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { LAUNCH_CITIES } from '@/constants/cities';
import { useCreateEventStore } from '@/stores/createEventStore';
import { geocodeAddress } from '@/services/geocoding';
import { VenueType } from '@/types/models';

const VENUE_TYPES: { value: VenueType; label: string }[] = [
  { value: 'quinta', label: 'Quinta' },
  { value: 'casa', label: 'Casa' },
  { value: 'bar', label: 'Bar' },
  { value: 'boliche', label: 'Boliche' },
  { value: 'playa', label: 'Playa' },
  { value: 'espacio_alquilado', label: 'Espacio alquilado' },
  { value: 'otro', label: 'Otro' },
];

export default function CreateEventStep2() {
  const router = useRouter();
  const { draft, update } = useCreateEventStore();
  const [error, setError] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  const defaultCity = LAUNCH_CITIES.find((c) => c.name === draft.city) ?? LAUNCH_CITIES[0];
  const pinLat = draft.exactLat ?? defaultCity.lat;
  const pinLng = draft.exactLng ?? defaultCity.lng;
  const pinMarkers = useMemo<MapMarkerSpec[]>(
    () => [{ id: 'pin', kind: 'dot', lat: pinLat, lng: pinLng, color: colors.accent, draggable: true }],
    [pinLat, pinLng]
  );

  const handleSearchAddress = async () => {
    if (!draft.exactAddress.trim()) {
      setGeocodeError('Escribí una dirección primero.');
      return;
    }
    setGeocoding(true);
    setGeocodeError(null);
    try {
      const query = `${draft.exactAddress}, ${draft.city || defaultCity.name}, Argentina`;
      const result = await geocodeAddress(query);
      if (!result) {
        setGeocodeError('No encontramos esa dirección. Ajustá el punto manualmente en el mapa.');
        return;
      }
      update({ exactLat: result.lat, exactLng: result.lng });
    } catch {
      setGeocodeError('No pudimos buscar la dirección. Probá de nuevo o marcá el punto en el mapa.');
    } finally {
      setGeocoding(false);
    }
  };

  const handleNext = () => {
    if (!draft.venueType || !draft.city || !draft.exactAddress.trim() || draft.exactLat == null) {
      setError('Elegí el tipo de lugar, la ciudad, la dirección y marcá el punto exacto en el mapa.');
      return;
    }
    setError(null);
    router.push('/event/create/step-3');
  };

  return (
    <Screen edges={['top', 'bottom']} padded>
      <WizardHeader step={2} totalSteps={4} title="¿Dónde es?" />

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <View>
            <Text style={styles.label}>Tipo de lugar</Text>
            <View style={styles.grid}>
              {VENUE_TYPES.map((v) => (
                <CategoryChip key={v.value} label={v.label} active={draft.venueType === v.value} onPress={() => update({ venueType: v.value })} />
              ))}
            </View>
            {(draft.venueType === 'casa' || draft.venueType === 'quinta') && (
              <Text style={styles.hint}>
                Como es un domicilio particular, mostramos una ubicación aproximada en el mapa público — la dirección exacta solo se
                revela a quienes aceptes.
              </Text>
            )}
          </View>

          <View>
            <Text style={styles.label}>Ciudad</Text>
            <View style={styles.grid}>
              {LAUNCH_CITIES.map((c) => (
                <CategoryChip
                  key={c.name}
                  label={c.name}
                  active={draft.city === c.name}
                  onPress={() => update({ city: c.name, exactLat: draft.exactLat ?? c.lat, exactLng: draft.exactLng ?? c.lng })}
                />
              ))}
            </View>
          </View>

          <Input label="Zona / barrio (opcional)" placeholder="Ej: Zona Norte" value={draft.neighborhood} onChangeText={(t) => update({ neighborhood: t })} />
          <View style={styles.addressBlock}>
            <Input
              label="Dirección exacta"
              placeholder="Ej: Cañada 2061"
              value={draft.exactAddress}
              onChangeText={(t) => update({ exactAddress: t })}
            />
            <Button label="Buscar en el mapa" variant="outline" onPress={handleSearchAddress} loading={geocoding} />
            {geocodeError ? <Text style={styles.error}>{geocodeError}</Text> : null}
            <Text style={styles.hint}>
              Busca la dirección y ubica el punto automáticamente — igual podés ajustarlo a mano después.
            </Text>
          </View>

          <View>
            <Text style={styles.label}>Marcá el punto exacto</Text>
            <View style={styles.mapWrapper}>
              <AppMap
                style={StyleSheet.absoluteFill}
                center={{ lat: pinLat, lng: pinLng }}
                zoom={16}
                pitch={0}
                markers={pinMarkers}
                onMapPress={(coord) => update({ exactLat: coord.lat, exactLng: coord.lng })}
                onMarkerDragEnd={(_id, coord) => update({ exactLat: coord.lat, exactLng: coord.lng })}
              />
            </View>
            <Text style={styles.hint}>Tocá el mapa o arrastrá el marcador para ajustar la ubicación.</Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button label="Continuar" onPress={handleNext} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md, paddingBottom: spacing.xxl },
  addressBlock: { gap: spacing.xs },
  label: { color: colors.textSecondary, fontSize: typography.size.sm, fontWeight: typography.weight.medium, marginBottom: spacing.xxs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  hint: { color: colors.textMuted, fontSize: typography.size.xs, marginTop: spacing.xxs, lineHeight: 16 },
  mapWrapper: { height: 220, borderRadius: radii.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  error: { color: colors.danger, fontSize: typography.size.sm },
});
