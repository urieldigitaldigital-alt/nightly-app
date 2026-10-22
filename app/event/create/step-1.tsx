import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CategoryChip } from '@/components/ui/CategoryChip';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { WizardHeader } from '@/components/event/WizardHeader';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useCategories } from '@/hooks/useCategories';
import { useCreateEventStore } from '@/stores/createEventStore';

export default function CreateEventStep1() {
  const router = useRouter();
  const { draft, update } = useCreateEventStore();
  const { categories } = useCategories();
  const [error, setError] = useState<string | null>(null);

  const pickCover = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 10],
      quality: 0.8,
    });
    if (!result.canceled) update({ coverPhotoUri: result.assets[0].uri });
  };

  const handleNext = () => {
    if (!draft.title.trim() || !draft.description.trim() || !draft.categorySlug || !draft.startsAt) {
      setError('Completá el nombre, la descripción, la categoría y la fecha para continuar.');
      return;
    }
    setError(null);
    router.push('/event/create/step-2');
  };

  return (
    <Screen edges={['top', 'bottom']} padded>
      <WizardHeader step={1} totalSteps={4} title="Contanos de tu fiesta" />

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Pressable style={styles.coverPicker} onPress={pickCover}>
          {draft.coverPhotoUri ? (
            <Image source={{ uri: draft.coverPhotoUri }} style={styles.coverImage} contentFit="cover" />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Ionicons name="image-outline" size={28} color={colors.textMuted} />
              <Text style={styles.coverPlaceholderText}>Agregar portada</Text>
            </View>
          )}
        </Pressable>

        <View style={styles.form}>
          <Input label="Nombre de la fiesta" placeholder="Ej: Previa Beach Sunset" value={draft.title} onChangeText={(t) => update({ title: t })} />
          <Input
            label="Descripción"
            placeholder="Contá de qué se trata, qué onda, qué esperar..."
            multiline
            numberOfLines={4}
            style={{ minHeight: 90, textAlignVertical: 'top', paddingTop: spacing.sm }}
            value={draft.description}
            onChangeText={(t) => update({ description: t })}
          />

          <View>
            <Text style={styles.label}>Categoría</Text>
            <View style={styles.grid}>
              {categories
                .filter((c) => c.slug !== 'all')
                .map((c) => (
                  <CategoryChip key={c.slug} label={c.label} active={draft.categorySlug === c.slug} onPress={() => update({ categorySlug: c.slug })} />
                ))}
            </View>
          </View>

          <DateTimeField
            label="Inicio"
            value={draft.startsAt}
            minimumDate={new Date()}
            onChange={(d) => update({ startsAt: d })}
          />
          <DateTimeField label="Fin (opcional)" value={draft.endsAt} minimumDate={draft.startsAt ?? new Date()} onChange={(d) => update({ endsAt: d })} />

          <Input
            label="Edad mínima (opcional)"
            placeholder="18"
            keyboardType="number-pad"
            value={draft.minAge}
            onChangeText={(t) => update({ minAge: t.replace(/\D/g, '') })}
          />
          <Input
            label="Reglas del evento (opcional)"
            placeholder="Ej: no se permite ingresar con botellas de vidrio"
            multiline
            numberOfLines={3}
            style={{ minHeight: 70, textAlignVertical: 'top', paddingTop: spacing.sm }}
            value={draft.rules}
            onChangeText={(t) => update({ rules: t })}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button label="Continuar" onPress={handleNext} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  coverPicker: { height: 160, borderRadius: radii.lg, overflow: 'hidden', marginBottom: spacing.lg },
  coverImage: { width: '100%', height: '100%' },
  coverPlaceholder: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  coverPlaceholderText: { color: colors.textMuted, fontSize: typography.size.sm },
  form: { gap: spacing.md, paddingBottom: spacing.xxl },
  label: { color: colors.textSecondary, fontSize: typography.size.sm, fontWeight: typography.weight.medium, marginBottom: spacing.xxs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  error: { color: colors.danger, fontSize: typography.size.sm },
});
