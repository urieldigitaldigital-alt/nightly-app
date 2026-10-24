import { useEffect, useRef } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

// Visual content height of the bar on a device with no home-indicator inset
// (what it already looked like before this safe-area fix) — the actual
// rendered height below adds the inset on top of this so nothing ever sits
// under the home indicator / Android gesture bar.
const TAB_BAR_CONTENT_HEIGHT = 84;

function vibrateTap() {
  if (Platform.OS === 'web') {
    // navigator.vibrate is Chrome/Android-only — iOS Safari has no web
    // vibration API at all, so this silently no-ops there.
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch {}
    }
    return;
  }
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

function TabIcon({ focused, name, size, color }: { focused: boolean; name: keyof typeof Ionicons.glyphMap; size: number; color: string }) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const dotScale = useSharedValue(focused ? 1 : 0);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip the entrance bounce/haptic for whichever tab happens to be
    // focused on first mount — it should only react to real tab switches.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (reducedMotion) {
      scale.value = 1;
      dotScale.value = focused ? 1 : 0;
      return;
    }
    if (focused) {
      scale.value = withSequence(withTiming(1.2, { duration: 100 }), withSpring(1, { damping: 7, stiffness: 220 }));
      dotScale.value = withSpring(1, { damping: 10, stiffness: 220 });
      vibrateTap();
    } else {
      dotScale.value = withTiming(0, { duration: 150 });
    }
  }, [focused, reducedMotion, scale, dotScale]);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const dotStyle = useAnimatedStyle(() => ({ transform: [{ scale: dotScale.value }] }));

  return (
    <View style={styles.iconWrap}>
      <Animated.View style={iconStyle}>
        <Ionicons name={name} size={size} color={color} />
      </Animated.View>
      <Animated.View style={[styles.activeDot, dotStyle, { backgroundColor: color }]} />
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: [styles.tabBar, { height: TAB_BAR_CONTENT_HEIGHT + insets.bottom }],
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Descubrir',
          tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} name={focused ? 'compass' : 'compass-outline'} size={24} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} name={focused ? 'map' : 'map-outline'} size={24} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="publish"
        options={{
          title: 'Publicar',
          tabBarIcon: ({ color }) => (
            <View style={styles.publishButton}>
              <Ionicons name="add" size={26} color={colors.accentText} />
            </View>
          ),
          tabBarLabelStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} name={focused ? 'chatbubble' : 'chatbubble-outline'} size={22} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} name={focused ? 'person' : 'person-outline'} size={22} color={color as string} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  publishButton: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
  },
  iconWrap: { alignItems: 'center', justifyContent: 'center', gap: 3 },
  activeDot: { width: 4, height: 4, borderRadius: 2 },
});
