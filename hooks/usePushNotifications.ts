import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { registerPushToken } from '@/services/notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Registers (and re-registers on token refresh) this device's Expo push
 * token once there's an authenticated session. No-ops silently if the user
 * denies the permission — push is optional, the app works without it. */
export function usePushNotifications(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    let subscription: Notifications.Subscription | undefined;

    (async () => {
      // Web push needs a VAPID key configured in app.json that this project
      // doesn't have yet — skip registering there instead of throwing on
      // every load. Native (iOS/Android) push works as-is.
      if (Platform.OS === 'web') return;

      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let status = existingStatus;
        if (status !== 'granted') {
          const result = await Notifications.requestPermissionsAsync();
          status = result.status;
        }
        if (status !== 'granted') return;

        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const tokenResponse = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
        await registerPushToken(tokenResponse.data, Platform.OS === 'ios' ? 'ios' : 'android');
      } catch (e) {
        // Push is optional — a failed registration (denied permission,
        // simulator with no APNs entitlement, etc.) shouldn't be a crash.
        console.warn('[nightly] push registration failed', e);
      }
    })();

    subscription = Notifications.addNotificationResponseReceivedListener(() => {
      // Deep-linking from a tapped push notification is handled by the OS
      // opening the app; screen-level routing from notification data is
      // handled in app/notifications.tsx once the user is in-app.
    });

    return () => subscription?.remove();
  }, [enabled]);
}
