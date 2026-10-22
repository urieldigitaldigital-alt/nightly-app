import { create } from 'zustand';
import * as Location from 'expo-location';
import { LAUNCH_CITIES } from '@/constants/cities';

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

export const useLocationStore = create<LocationState>((set) => ({
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
  },

  setManualCity: (city) => {
    set({ origin: { lat: city.lat, lng: city.lng, label: city.name, isCurrentLocation: false } });
  },

  setRadiusKm: (radiusKm) => set({ radiusKm }),
}));
