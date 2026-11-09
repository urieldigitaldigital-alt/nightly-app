import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { colors, typography } from '@/constants/theme';

type Props = {
  uri?: string | null;
  name: string;
  size?: number;
  /** Aro cian. Se usa en el marcador elegido y en la ficha, no en la lista. */
  ring?: boolean;
};

/**
 * Logo circular de un boliche, con la inicial como respaldo.
 *
 * El respaldo no es solo para cuando falta el logo: también cubre que la
 * imagen esté cargada pero no se pueda bajar. Sin `onError` quedaría un
 * círculo vacío, que se lee como que la app se rompió; con la inicial se lee
 * como un lugar al que todavía le falta el logo.
 */
export function VenueLogo({ uri, name, size = 44, ring = false }: Props) {
  const [failed, setFailed] = useState(false);

  const frame = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };
  const ringStyle = ring ? { borderWidth: 2, borderColor: colors.accent } : null;

  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        style={[frame, ringStyle, styles.image]}
        contentFit="cover"
        transition={150}
        onError={() => setFailed(true)}
        accessibilityLabel={name}
      />
    );
  }

  return (
    <View style={[frame, ringStyle, styles.fallback]}>
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{name.trim().charAt(0).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.surfaceAlt },
  fallback: {
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: colors.accent,
    fontWeight: typography.weight.bold,
  },
});
