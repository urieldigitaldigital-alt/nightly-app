import { Stack } from 'expo-router';
import { colors } from '@/constants/theme';

export default function CreateEventLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="step-1" />
      <Stack.Screen name="step-2" />
      <Stack.Screen name="step-3" />
      <Stack.Screen name="step-4" />
    </Stack>
  );
}
