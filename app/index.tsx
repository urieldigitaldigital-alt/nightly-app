import { Redirect } from 'expo-router';

/**
 * Bare entry route. The guard in app/_layout.tsx immediately redirects to
 * /(tabs)/discover when there's an authenticated, onboarded session — this
 * is just the fallback target for a signed-out cold start.
 */
export default function Index() {
  return <Redirect href="/(auth)/welcome" />;
}
