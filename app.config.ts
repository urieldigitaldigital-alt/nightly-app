import type { ExpoConfig } from 'expo/config';

// Single source of truth for each permission's usage-description string —
// both the top-level `ios.infoPlist` block AND the individual config
// plugins below (expo-location, expo-image-picker) end up writing to the
// same Info.plist keys at prebuild time, and a plugin that doesn't get an
// explicit string falls back to a generic English default that would
// silently override the Spanish one. Defining each message once and
// reusing it everywhere keeps them from drifting out of sync or getting
// clobbered.
const LOCATION_PERMISSION_MESSAGE =
  'NIGHTLY usa tu ubicación para mostrarte las previas y fiestas que están pasando cerca tuyo, dentro de un radio que vos elegís.';
const CAMERA_PERMISSION_MESSAGE = 'NIGHTLY necesita la cámara para que puedas sacar una foto de perfil o subir fotos a tu evento.';
const PHOTO_LIBRARY_PERMISSION_MESSAGE = 'NIGHTLY necesita acceso a tus fotos para que puedas elegir una imagen de perfil o portada de evento.';

// newArchEnabled is a valid Expo SDK 51+ config key not yet reflected in the
// ExpoConfig type shipped with this SDK version's @expo/config-types.
const config: ExpoConfig & { newArchEnabled?: boolean } = {
  name: 'NIGHTLY',
  slug: 'nightly',
  scheme: 'nightly',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  backgroundColor: '#080808',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.nightly.app',
    buildNumber: '1',
    infoPlist: {
      NSLocationWhenInUseUsageDescription: LOCATION_PERMISSION_MESSAGE,
      NSCameraUsageDescription: CAMERA_PERMISSION_MESSAGE,
      NSPhotoLibraryUsageDescription: PHOTO_LIBRARY_PERMISSION_MESSAGE,
    },
  },
  android: {
    package: 'com.nightly.app',
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: '#080808',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION', 'CAMERA', 'READ_EXTERNAL_STORAGE'],
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
    // Lets "Add to Home Screen" on Android/Chrome open without browser
    // chrome too — iOS Safari needs the apple-mobile-web-app-capable meta
    // tag in app/+html.tsx instead, since it ignores this manifest field.
    name: 'NIGHTLY',
    shortName: 'NIGHTLY',
    display: 'standalone',
    themeColor: '#080808',
    backgroundColor: '#080808',
  },
  plugins: [
    '@react-native-community/datetimepicker',
    'expo-web-browser',
    'expo-router',
    'expo-font',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 180,
        resizeMode: 'contain',
        backgroundColor: '#080808',
      },
    ],
    'expo-image',
    'expo-secure-store',
    [
      'expo-location',
      {
        locationWhenInUsePermission: LOCATION_PERMISSION_MESSAGE,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: PHOTO_LIBRARY_PERMISSION_MESSAGE,
        cameraPermission: CAMERA_PERMISSION_MESSAGE,
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/icon.png',
        color: '#C8FF4D',
      },
    ],
  ],
  extra: {
    router: {},
    eas: {
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
    },
  },
};

export default config;
