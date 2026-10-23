import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { updateMyProfile } from '@/services/profiles';
import { uploadAvatar } from '@/services/storage';
import { requestAccountDeletion, signOut } from '@/services/auth';

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
  const [deleting, setDeleting] = useState(false);

  const toggleGenre = (genre: string) => {
    setInterests((prev) => (prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]));
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled) setLocalPhotoUri(result.assets[0].uri);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      let avatarUrl: string | undefined;
      if (localPhotoUri && session) avatarUrl = await uploadAvatar(session.user.id, localPhotoUri);
      await updateMyProfile({ displayName, bio, city, musicInterests: interests, avatarUrl });
      await refreshProfile();
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Eliminar cuenta',
      'Esta acción es permanente: se borran tu perfil, tus fiestas publicadas y tus conversaciones. ¿Confirmás?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await requestAccountDeletion();
              // The account is gone server-side; signOut() just clears the
              // now-dangling local session so app/_layout.tsx's guard sends
              // us to welcome instead of leaving the app stuck mid-screen.
              await signOut();
            } catch (e: any) {
              Alert.alert('No pudimos eliminar tu cuenta', 'Probá de nuevo en unos minutos.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
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

          <Button label="Guardar cambios" onPress={handleSave} loading={loading} />

          <Pressable style={styles.deleteRow} onPress={handleDeleteAccount} disabled={deleting}>
            <Text style={styles.deleteText}>{deleting ? 'Eliminando...' : 'Eliminar mi cuenta'}</Text>
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
  label: { color: colors.textSecondary, fontSize: typography.size.sm, fontWeight: typography.weight.medium },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  deleteRow: { alignItems: 'center', marginTop: spacing.lg },
  deleteText: { color: colors.danger, fontSize: typography.size.sm, fontWeight: typography.weight.medium },
});
