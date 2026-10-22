import { Stack } from 'expo-router';
import { colors } from '@/constants/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="register" />
      <Stack.Screen name="login" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="confirm-birthdate" />
      <Stack.Screen name="onboarding-profile" />
      <Stack.Screen name="onboarding-interests" />
      <Stack.Screen name="location-permission" />
    </Stack>
  );
}
