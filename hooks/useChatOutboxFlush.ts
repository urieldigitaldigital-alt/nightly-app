import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useChatOutboxStore } from '@/stores/chatOutboxStore';

/** Mounted once at the app root — retries every queued chat message as soon
 * as connectivity comes back, regardless of which (if any) chat screen is
 * currently open. Also makes one attempt right on mount, in case messages
 * were queued in a previous session and the app is already online by the
 * time it opens. */
export function useChatOutboxFlush() {
  const flushErrors = useChatOutboxStore((s) => s.flushErrors);

  useEffect(() => {
    flushErrors();

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) flushErrors();
    });

    return () => unsubscribe();
  }, [flushErrors]);
}
