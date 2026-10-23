import type { ExpoConfig } from 'expo/config';

// newArchEnabled is a valid Expo SDK 51+ config key not yet reflected in the
// ExpoConfig type shipped with this SDK version's @expo/config-types.
const config: ExpoConfig & { newArchEnabled?: boolean } = {
  name: 'NIGHTLY',
  slug: 'nightly',
  scheme: 'nightly',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  backgroundColor: '#080808',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.nightly.app',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'NIGHTLY usa tu ubicación para mostrarte las previas y fiestas que están pasando cerca tuyo, dentro de un radio que vos elegís.',
      NSCameraUsageDescription:
        'NIGHTLY necesita la cámara para que puedas sacar una foto de perfil o subir fotos a tu evento.',
      NSPhotoLibraryUsageDescription:
        'NIGHTLY necesita acceso a tus fotos para que puedas elegir una imagen de perfil o portada de evento.',
    },
  },
  android: {
    package: 'com.nightly.app',
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
    'expo-splash-screen',
    'expo-image',
    'expo-secure-store',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'NIGHTLY usa tu ubicación para mostrarte las previas y fiestas que están pasando cerca tuyo.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'NIGHTLY necesita acceso a tus fotos para elegir una imagen de perfil o portada de evento.',
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
