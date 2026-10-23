import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { LAUNCH_CITIES } from '@/constants/cities';
import { supabase } from '@/lib/supabase';

export type DiscoveryOrigin = {
  lat: number;
  lng: number;
  label: string;
  isCurrentLocation: boolean;
};

type LocationState = {
  permissionStatus: Location.PermissionStatus | null;
  origin: DiscoveryOrigin;
  radiusKm: number;
  requestPermissionAndLocate: () => Promise<void>;
  setManualCity: (city: { name: string; lat: number; lng: number }) => void;
  setRadiusKm: (radiusKm: number) => void;
};

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      permissionStatus: null,
      // Default to the first launch city until we know the device's real location
      // or the user picks one — never silently pretend GPS data exists.
      origin: {
        lat: LAUNCH_CITIES[0].lat,
        lng: LAUNCH_CITIES[0].lng,
        label: LAUNCH_CITIES[0].name,
        isCurrentLocation: false,
      },
      radiusKm: 50,

      requestPermissionAndLocate: async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        set({ permissionStatus: status });

        if (status !== Location.PermissionStatus.GRANTED) return;

        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        set({
          origin: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            label: 'Tu ubicación',
            isCurrentLocation: true,
          },
        });

        // Opportunistic "last known location" for nearby-event push matching
        // only — not continuous tracking, just this one write per successful
        // fix. Never blocks the UI on failure; the feature degrades to "no
        // nearby alerts for this user" rather than breaking location browsing.
        supabase
          .rpc('upsert_my_location', { p_lat: position.coords.latitude, p_lng: position.coords.longitude })
          .then(({ error }) => {
            if (error) console.warn('[nightly] upsert_my_location failed', error.message);
          });
      },

      setManualCity: (city) => {
        set({ origin: { lat: city.lat, lng: city.lng, label: city.name, isCurrentLocation: false } });
      },

      setRadiusKm: (radiusKm) => set({ radiusKm }),
    }),
    {
      name: 'nightly-location-prefs',
      storage: createJSONStorage(() => AsyncStorage),
      // Only the radius survives a restart — origin/permission are re-derived
      // fresh each session rather than trusting stale coordinates.
      partialize: (state) => ({ radiusKm: state.radiusKm }),
    }
  )
);
