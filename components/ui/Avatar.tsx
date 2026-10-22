import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '@/constants/theme';

type Props = {
  uri?: string | null;
  name: string;
  size?: number;
};

export function Avatar({ uri, name, size = 40 }: Props) {
  const initials = getInitials(name);
  const dimension = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return <Image source={{ uri }} style={dimension} contentFit="cover" transition={150} />;
  }

  return (
    <View style={[styles.fallback, dimension]}>
      <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: colors.textPrimary,
    fontWeight: typography.weight.semibold,
  },
});
