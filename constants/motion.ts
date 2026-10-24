import { Easing } from 'react-native-reanimated';

/**
 * Shared animation constants so every component's "tap to shrink", "slide
 * in with a little overshoot" etc. feels like one consistent system instead
 * of each screen inventing its own numbers.
 */
export const motion = {
  // iOS-style entrance curve with a slight overshoot — cubic-bezier(0.34, 1.56, 0.64, 1).
  entranceEasing: Easing.bezier(0.34, 1.56, 0.64, 1),
  // iOS-style movement/transition curve (no overshoot) — cubic-bezier(0.32, 0.72, 0, 1).
  moveEasing: Easing.bezier(0.32, 0.72, 0, 1),
  pressScale: 0.96,
  pressDuration: 100,
  releaseSpring: { damping: 14, stiffness: 240, mass: 0.9 },
  staggerStep: 45,
  staggerCap: 6,
} as const;
