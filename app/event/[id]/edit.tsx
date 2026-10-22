import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { LoadingState } from '@/components/ui/LoadingState';
import { colors, spacing, typography } from '@/constants/theme';
import { useEventDetail } from '@/hooks/useEventDetail';
import { supabase } from '@/lib/supabase';

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: event, isLoading } = useEventDetail(id);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState('');
  const [capacity, setCapacity] = useState('');
  const [startsAt, setStartsAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description);
      setRules(event.rules ?? '');
      setCapacity(event.capacity != null ? String(event.capacity) : '');
      setStartsAt(new Date(event.startsAt));
    }
  }, [event]);

  if (isLoading || !event) return <LoadingState fullscreen />;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from('events')
        .update({
          title,
          description,
          rules: rules || null,
          capacity: capacity ? Number(capacity) : null,
          starts_at: startsAt?.toISOString(),
        })
        .eq('id', event.id);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ['event-detail', event.id] });
      queryClient.invalidateQueries({ queryKey: ['my-events'] });
      router.back();
    } catch (e: any) {
      setError('No pudimos guardar los cambios. Probá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']} padded>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Editar fiesta</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <Input label="Nombre" value={title} onChangeText={setTitle} />
          <Input
            label="Descripción"
            multiline
            numberOfLines={4}
            style={{ minHeight: 90, textAlignVertical: 'top', paddingTop: spacing.sm }}
            value={description}
            onChangeText={setDescription}
          />
          <DateTimeField label="Inicio" value={startsAt} onChange={setStartsAt} />
          <Input label="Capacidad (vacío = sin límite)" keyboardType="number-pad" value={capacity} onChangeText={(t) => setCapacity(t.replace(/\D/g, ''))} />
          <Input
            label="Reglas"
            multiline
            numberOfLines={3}
            style={{ minHeight: 70, textAlignVertical: 'top', paddingTop: spacing.sm }}
            value={rules}
            onChangeText={setRules}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button label="Guardar cambios" onPress={handleSave} loading={saving} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  title: { color: colors.textPrimary, fontSize: typography.size.lg, fontWeight: typography.weight.bold },
  form: { gap: spacing.md, paddingBottom: spacing.xxl },
  error: { color: colors.danger, fontSize: typography.size.sm },
});
