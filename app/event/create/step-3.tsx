import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CategoryChip } from '@/components/ui/CategoryChip';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { WizardHeader } from '@/components/event/WizardHeader';
import { colors, spacing, typography } from '@/constants/theme';
import { useCreateEventStore } from '@/stores/createEventStore';
import { AccessMode } from '@/types/models';

const ACCESS_MODES: { value: AccessMode; label: string; description: string }[] = [
  { value: 'open', label: 'Acceso abierto', description: 'Cualquiera puede unirse al instante, sin aprobación, mientras haya lugar.' },
  { value: 'request', label: 'Con solicitud', description: 'Vos revisás y aceptás o rechazás cada pedido de acceso.' },
  { value: 'invite_only', label: 'Solo invitados', description: 'Nadie puede pedir acceso — vos invitás directamente desde la app.' },
];

export default function CreateEventStep3() {
  const router = useRouter();
  const { draft, update } = useCreateEventStore();
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    if (draft.capacity && Number(draft.capacity) <= 0) {
      setError('La capacidad tiene que ser mayor a 0, o dejala vacía si es ilimitada.');
      return;
    }
    if (!draft.isFree && (!draft.priceCents || Number(draft.priceCents) <= 0)) {
      setError('Ingresá un precio de entrada, o marcá el evento como gratuito.');
      return;
    }
    setError(null);
    router.push('/event/create/step-4');
  };

  return (
    <Screen edges={['top', 'bottom']} padded>
      <WizardHeader step={3} totalSteps={4} title="Capacidad y acceso" />

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <Input
            label="Capacidad máxima (opcional)"
            placeholder="Dejar vacío = sin límite"
            keyboardType="number-pad"
            value={draft.capacity}
            onChangeText={(t) => update({ capacity: t.replace(/\D/g, '') })}
          />

          <View style={styles.row}>
            <Text style={styles.switchLabel}>Entrada gratuita</Text>
            <Switch
              value={draft.isFree}
              onValueChange={(v) => update({ isFree: v, priceCents: v ? '' : draft.priceCents })}
              trackColor={{ false: colors.surfaceRaised, true: colors.accent }}
            />
          </View>

          {!draft.isFree && (
            <Input
              label="Precio de entrada (ARS)"
              placeholder="5000"
              keyboardType="number-pad"
              value={draft.priceCents}
              onChangeText={(t) => update({ priceCents: t.replace(/\D/g, '') })}
            />
          )}

          <View>
            <Text style={styles.label}>Modo de acceso</Text>
            <View style={styles.accessList}>
              {ACCESS_MODES.map((mode) => (
                <View key={mode.value} style={styles.accessOption}>
                  <CategoryChip label={mode.label} active={draft.accessMode === mode.value} onPress={() => update({ accessMode: mode.value })} />
                  {draft.accessMode === mode.value && <Text style={styles.accessDescription}>{mode.description}</Text>}
                </View>
              ))}
            </View>
          </View>

          {draft.accessMode !== 'open' && (
            <DateTimeField
              label="Fecha límite para solicitar (opcional)"
              value={draft.requestDeadline}
              minimumDate={new Date()}
              onChange={(d) => update({ requestDeadline: d })}
            />
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button label="Continuar" onPress={handleNext} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md, paddingBottom: spacing.xxl },
  label: { color: colors.textSecondary, fontSize: typography.size.sm, fontWeight: typography.weight.medium, marginBottom: spacing.xxs },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { color: colors.textPrimary, fontSize: typography.size.md, fontWeight: typography.weight.medium },
  accessList: { gap: spacing.sm },
  accessOption: { gap: spacing.xxs },
  accessDescription: { color: colors.textMuted, fontSize: typography.size.xs, paddingLeft: spacing.xs, lineHeight: 16 },
  error: { color: colors.danger, fontSize: typography.size.sm },
});
