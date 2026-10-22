import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { colors, spacing, typography } from '@/constants/theme';
import { LAUNCH_CITIES } from '@/constants/cities';
import { CategoryChip } from '@/components/ui/CategoryChip';
import { updateMyProfile } from '@/services/profiles';
import { uploadAvatar } from '@/services/storage';
import { useAuthStore } from '@/stores/authStore';

export default function OnboardingProfileScreen() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [city, setCity] = useState<string>(LAUNCH_CITIES[0].name);
  const [loading, setLoading] = useState(false);

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setLocalPhotoUri(result.assets[0].uri);
  };

  const handleContinue = async () => {
    setLoading(true);
    try {
      let avatarUrl: string | undefined;
      if (localPhotoUri && session) {
        avatarUrl = await uploadAvatar(session.user.id, localPhotoUri);
      }
      await updateMyProfile({ bio: bio || undefined, city, avatarUrl });
      await refreshProfile();
      router.push('/(auth)/onboarding-interests');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']} padded>
      <Text style={styles.step}>Paso 1 de 3</Text>
      <Text style={styles.title}>Armá tu perfil</Text>
      <Text style={styles.subtitle}>Una foto ayuda a que los organizadores confíen en tu solicitud.</Text>

      <Pressable onPress={pickPhoto} style={styles.photoPicker}>
        <Avatar uri={localPhotoUri} name={session?.user.email ?? '?'} size={96} />
        <View style={styles.cameraBadge}>
          <Ionicons name="camera" size={16} color={colors.accentText} />
        </View>
      </Pressable>
      <Text style={styles.photoHint}>Opcional — podés agregarla después</Text>

      <Input label="Una frase sobre vos (opcional)" placeholder="¿Qué te gusta de salir?" value={bio} onChangeText={setBio} />

      <Text style={styles.label}>¿Desde dónde salís?</Text>
      <View style={styles.cityGrid}>
        {LAUNCH_CITIES.map((c) => (
          <CategoryChip key={c.name} label={c.name} active={city === c.name} onPress={() => setCity(c.name)} />
        ))}
      </View>

      <View style={styles.footer}>
        <Button label="Continuar" onPress={handleContinue} loading={loading} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  step: { color: colors.accent, fontSize: typography.size.sm, fontWeight: typography.weight.semibold, marginTop: spacing.md },
  title: { color: colors.textPrimary, fontSize: typography.size.xxl, fontWeight: typography.weight.bold, marginTop: spacing.xxs },
  subtitle: { color: colors.textSecondary, fontSize: typography.size.md, marginTop: spacing.xxs, marginBottom: spacing.xl, lineHeight: 20 },
  photoPicker: { alignSelf: 'center' },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.accent,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  photoHint: { color: colors.textMuted, fontSize: typography.size.xs, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.lg },
  label: { color: colors.textSecondary, fontSize: typography.size.sm, fontWeight: typography.weight.medium, marginTop: spacing.lg, marginBottom: spacing.xs },
  cityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  footer: { marginTop: 'auto', paddingTop: spacing.xl },
});
