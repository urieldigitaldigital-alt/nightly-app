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
  'Afterdune usa tu ubicación para mostrarte las previas y fiestas que están pasando cerca tuyo, dentro de un radio que vos elegís.';
const PHOTO_LIBRARY_PERMISSION_MESSAGE = 'Afterdune necesita acceso a tus fotos para que puedas elegir una imagen de perfil o portada de evento.';

// newArchEnabled is a valid Expo SDK 51+ config key not yet reflected in the
// ExpoConfig type shipped with this SDK version's @expo/config-types.
const config: ExpoConfig & { newArchEnabled?: boolean } = {
  name: 'Afterdune',
  slug: 'afterdune',
  scheme: 'afterdune',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  backgroundColor: '#080808',
  newArchEnabled: true,
  // expo-updates: permite publicar arreglos de JavaScript sin pasar por una
  // revisión nueva de Apple. EAS lo instaló al preparar el primer build y
  // pide estas dos claves; como este archivo es un .ts dinámico, no puede
  // escribirlas solo.
  //
  // `appVersion` ata cada actualización a la versión de la app (1.0.0): un
  // binario nunca va a recibir JavaScript pensado para otra versión, que es
  // justo la forma de romper una app en producción con una actualización
  // por aire.
  updates: {
    url: 'https://u.expo.dev/d5a591ce-a0fb-4182-b0da-40d29174f972',
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.afterdune.app',
    buildNumber: '1',
    // Generates the Sign In with Apple entitlement at prebuild time —
    // required since the app offers Google sign-in (Apple Guideline 4.8).
    usesAppleSignIn: true,
    infoPlist: {
      NSLocationWhenInUseUsageDescription: LOCATION_PERMISSION_MESSAGE,
      NSPhotoLibraryUsageDescription: PHOTO_LIBRARY_PERMISSION_MESSAGE,
      // La app no usa criptografía más allá de HTTPS, que está exenta.
      // Declararlo acá evita que App Store Connect pida el cuestionario de
      // export compliance en cada subida — y con él, una demora de horas por
      // build mientras se procesa.
      ITSAppUsesNonExemptEncryption: false,
    },
    // Privacy manifest (obligatorio desde mayo de 2024). App Store Connect
    // rechaza el binario si una API de "razón requerida" se usa sin declarar
    // para qué. Las cuatro categorías de abajo vienen de dependencias, no de
    // código propio: AsyncStorage usa UserDefaults, expo-image-picker y
    // expo-image leen marcas de tiempo y espacio en disco, y
    // react-native-reanimated usa el tiempo de arranque del sistema.
    privacyManifests: {
      NSPrivacyAccessedAPITypes: [
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
          NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
          NSPrivacyAccessedAPITypeReasons: ['C617.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
          NSPrivacyAccessedAPITypeReasons: ['E174.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime',
          NSPrivacyAccessedAPITypeReasons: ['35F9.1'],
        },
      ],
      // Nada de esto se usa para publicidad ni para seguimiento entre apps:
      // NSPrivacyTracking queda en false y no hay dominios de tracking.
      NSPrivacyTracking: false,
      NSPrivacyTrackingDomains: [],
      NSPrivacyCollectedDataTypes: [
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeEmailAddress',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeName',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypePreciseLocation',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypePhotosorVideos',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeOtherUserContent',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeUserID',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
      ],
    },
  },
  android: {
    package: 'com.afterdune.app',
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: '#080808',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    permissions: [
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
      // Android 13+ reemplazó READ_EXTERNAL_STORAGE por permisos por tipo de
      // medio. Se declaran los dos para cubrir el rango de versiones que
      // soporta la app.
      'READ_EXTERNAL_STORAGE',
      'READ_MEDIA_IMAGES',
      // Android 13+ pide permiso explícito para notificaciones. Sin esto,
      // expo-notifications no puede ni preguntar.
      'POST_NOTIFICATIONS',
    ],
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
    // Lets "Add to Home Screen" on Android/Chrome open without browser
    // chrome too — iOS Safari needs the apple-mobile-web-app-capable meta
    // tag in app/+html.tsx instead, since it ignores this manifest field.
    name: 'Afterdune',
    shortName: 'Afterdune',
    display: 'standalone',
    themeColor: '#080808',
    backgroundColor: '#080808',
  },
  plugins: [
    './plugins/withTabletOrientations',
    // Mapa nativo (MapLibre). Reemplazó al WebView que cargaba maplibre-gl
    // desde unpkg: ese dependía de un CDN externo en tiempo de ejecución, así
    // que con mala conexión — o con un revisor de Apple detrás de un
    // firewall — el mapa quedaba en negro, que es un rechazo por Guideline
    // 2.1 esperando a pasar.
    '@maplibre/maplibre-react-native',
    '@react-native-community/datetimepicker',
    'expo-web-browser',
    'expo-router',
    'expo-font',
    'expo-apple-authentication',
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
      // Fijo y no leído del entorno a propósito. Es el id del proyecto
      // @uriel-ilsen/afterdune en EAS: identidad, no secreto. Leerlo de
      // process.env hacía que el build fallara cuando la variable no estaba
      // —y no estaba—, porque EAS no puede escribir este valor solo en una
      // configuración dinámica como este archivo .ts.
      projectId: 'd5a591ce-a0fb-4182-b0da-40d29174f972',
    },
  },
};

export default config;
