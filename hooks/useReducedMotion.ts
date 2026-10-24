import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// Single source of truth for "should this screen skip/shorten its
// decorative animations" — AccessibilityInfo.isReduceMotionEnabled() reads
// the OS setting on native and prefers-reduced-motion on web (react-native-web
// maps it directly), so one hook covers both platforms.
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setReduced(value);
      })
      .catch(() => {});

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => setReduced(value));
    return () => {
      mounted = false;
      subscription?.remove?.();
    };
  }, []);

  return reduced;
}
