import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { CategoryChip } from '@/components/ui/CategoryChip';
import { colors, spacing, typography } from '@/constants/theme';
import { LAUNCH_CITIES } from '@/constants/cities';
import { MUSIC_GENRES } from '@/constants/musicGenres';
import { useAuthStore } from '@/stores/authStore';
import { userFacingError } from '@/lib/errors';
import { updateMyProfile } from '@/services/profiles';
import { uploadAvatar } from '@/services/storage';
import { ensurePhotoLibraryAccess } from '@/lib/permissions';

export default function EditProfileScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const session = useAuthStore((s) => s.session);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
  const [interests, setInterests] = useState<string[]>(profile?.musicInterests ?? []);
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleGenre = (genre: string) => {
    setInterests((prev) => (prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]));
  };

  const pickPhoto = async () => {
    if (!(await ensurePhotoLibraryAccess())) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled) setLocalPhotoUri(result.assets[0].uri);
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      let avatarUrl: string | undefined;
      if (localPhotoUri && session) avatarUrl = await uploadAvatar(session.user.id, localPhotoUri);
      await updateMyProfile({ displayName, bio, city, musicInterests: interests, avatarUrl });
      await refreshProfile();
      router.back();
    } catch (e: unknown) {
      // Antes el fallo era silencioso: el spinner paraba y la pantalla se
      // quedaba igual, sin decir nada. Con el filtro de contenido eso pasó a
      // ser un caso esperable, no una rareza.
      setError(userFacingError(e, 'No pudimos guardar tu perfil. Probá de nuevo.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']} padded>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Editar perfil</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Pressable onPress={pickPhoto} style={styles.photoPicker}>
          <Avatar uri={localPhotoUri ?? profile?.avatarUrl} name={profile?.displayName ?? '?'} size={88} />
          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={14} color={colors.accentText} />
          </View>
        </Pressable>

        <View style={styles.form}>
          <Input label="Nombre para mostrar" value={displayName} onChangeText={setDisplayName} />
          <Input label="Bio" multiline numberOfLines={3} style={{ minHeight: 70, textAlignVertical: 'top', paddingTop: spacing.sm }} value={bio} onChangeText={setBio} />

          <Text style={styles.label}>Ciudad</Text>
          <View style={styles.grid}>
            {LAUNCH_CITIES.map((c) => (
              <CategoryChip key={c.name} label={c.name} active={city === c.name} onPress={() => setCity(c.name)} />
            ))}
          </View>

          <Text style={styles.label}>Intereses musicales</Text>
          <View style={styles.grid}>
            {MUSIC_GENRES.map((genre) => (
              <CategoryChip key={genre} label={genre} active={interests.includes(genre)} onPress={() => toggleGenre(genre)} />
            ))}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button label="Guardar cambios" onPress={handleSave} loading={loading} />

          <Pressable style={styles.deleteRow} onPress={() => router.push('/settings/delete-account')}>
            <Text style={styles.deleteText}>Eliminar mi cuenta</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  title: { color: colors.textPrimary, fontSize: typography.size.xl, fontWeight: typography.weight.bold },
  photoPicker: { alignSelf: 'center', marginBottom: spacing.lg },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.accent,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  form: { gap: spacing.md, paddingBottom: spacing.xxl },
  error: { color: colors.danger, fontSize: typography.size.sm, lineHeight: 19 },
  label: { color: colors.textSecondary, fontSize: typography.size.sm, fontWeight: typography.weight.medium },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  deleteRow: { alignItems: 'center', marginTop: spacing.lg },
  deleteText: { color: colors.danger, fontSize: typography.size.sm, fontWeight: typography.weight.medium },
});
