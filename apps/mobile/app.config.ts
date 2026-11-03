import type { ExpoConfig } from '@expo/config-types';

// Android home-screen widgets (ADR 0035 §2, `src/features/widgets/android/names.ts`). The `name`s must match WIDGET_PROVIDERS.
// The gallery text is Arabic only: the library writes one non-translatable description per widget.
// previewImage crops come from AndroidWidgets frame (tmp/crop-widget-previews.py). Azkar is not on that
// frame — picker keeps the app icon until a dedicated crop exists.
const ANDROID_WIDGETS = [
  {
    name: 'NextPrayer',
    label: 'الصلاة القادمة',
    description: 'الصلاة القادمة ووقتها',
    minWidth: '110dp',
    minHeight: '110dp',
    targetCellWidth: 2,
    targetCellHeight: 2,
    resizeMode: 'none',
    updatePeriodMillis: 30 * 60 * 1000,
    widgetCategory: 'home_screen|keyguard',
    previewImage: './assets/widget-previews/NextPrayer.png',
  },
  {
    name: 'NextPrayerWide',
    label: 'مواقيت اليوم',
    description: 'الصلاة القادمة ومواقيت اليوم الخمسة',
    minWidth: '250dp',
    minHeight: '110dp',
    targetCellWidth: 4,
    targetCellHeight: 2,
    resizeMode: 'none',
    updatePeriodMillis: 30 * 60 * 1000,
    widgetCategory: 'home_screen',
    previewImage: './assets/widget-previews/NextPrayerWide.png',
  },
  {
    name: 'Progress',
    label: 'تقدّم اليوم',
    description: 'تقدّم أهدافك اليومية',
    minWidth: '250dp',
    minHeight: '110dp',
    targetCellWidth: 4,
    targetCellHeight: 2,
    resizeMode: 'none',
    updatePeriodMillis: 30 * 60 * 1000,
    widgetCategory: 'home_screen|keyguard',
    previewImage: './assets/widget-previews/Progress.png',
  },
  {
    name: 'ContinueReading',
    label: 'تابع القراءة',
    description: 'موضع قراءتك ووردك اليوم',
    minWidth: '250dp',
    minHeight: '110dp',
    targetCellWidth: 4,
    targetCellHeight: 2,
    resizeMode: 'none',
    updatePeriodMillis: 30 * 60 * 1000,
    widgetCategory: 'home_screen',
    previewImage: './assets/widget-previews/ContinueReading.png',
  },
  {
    name: 'Misbaha',
    label: 'المسبحة',
    description: 'عدّاد المسبحة ومجموع اليوم',
    minWidth: '110dp',
    minHeight: '110dp',
    targetCellWidth: 2,
    targetCellHeight: 2,
    resizeMode: 'none',
    updatePeriodMillis: 30 * 60 * 1000,
    widgetCategory: 'home_screen',
    previewImage: './assets/widget-previews/Misbaha.png',
  },
  {
    name: 'Azkar',
    label: 'الأذكار',
    description: 'جلسات الأذكار اليوم',
    minWidth: '250dp',
    minHeight: '110dp',
    targetCellWidth: 4,
    targetCellHeight: 2,
    resizeMode: 'none',
    updatePeriodMillis: 30 * 60 * 1000,
    widgetCategory: 'home_screen',
  },
];

// `expo/config` re-exports this with `export *`, which drops the type.
// The dynamic config callback only reads `config`.
type ConfigContext = {
  config: Partial<ExpoConfig>;
};

// APP_VARIANT is set per EAS build profile (eas.json). Local runs default to development.
// TestFlight and the App Store share the production bundle ID (ADR 0016).
// The bundle ID can never change after the first store build.
const VARIANTS = {
  development: { id: 'com.taybahapp.taybah.dev', name: 'Taybah (Dev)', nameAr: 'طيبة (تطوير)', scheme: 'taybah-dev' },
  production: { id: 'com.taybahapp.taybah', name: 'Taybah', nameAr: 'طيبة', scheme: 'taybah' },
} as const;

type Variant = keyof typeof VARIANTS;

function resolveVariant(value: string | undefined): Variant {
  const variant = value ?? 'development';
  if (!(variant in VARIANTS)) {
    throw new Error(`Unknown APP_VARIANT "${variant}". Use development or production.`);
  }
  return variant as Variant;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const variantKey = resolveVariant(process.env.APP_VARIANT);
  const variant = VARIANTS[variantKey];

  return {
    ...config,
    name: variant.name,
    slug: 'taybah',
    owner: 'themayman',
    version: '1.0.1',
    scheme: variant.scheme,
    // EAS Update (spec §14): JavaScript-only fixes reach installed builds on their channel (eas.json).
    // The fingerprint changes with any native change, so an update never lands on a build it doesn't match.
    // Launch never waits for the network (offline-first): a new update applies on the next cold start.
    runtimeVersion: { policy: 'fingerprint' },
    updates: {
      url: 'https://u.expo.dev/e58e645e-5912-4da1-8ea8-7bdb73d93f64',
      checkAutomatically: 'ON_LOAD',
      fallbackToCacheTimeout: 0,
    },
    // The home-screen name follows the device language. Each language needs its own entry: iOS picks the
    // app's localization only from the bundled lproj folders, so without en.lproj an English reader still
    // gets Arabic natural text alignment and Arabic system labels.
    locales: {
      ar: {
        ios: {
          CFBundleDisplayName: variant.nameAr,
          NSLocationWhenInUseUsageDescription: 'يحتاج طيبة إلى موقعك لعرض مواقيت الصلاة واتجاه القبلة.',
          NSLocationAlwaysAndWhenInUseUsageDescription: 'يحتاج طيبة إلى موقعك لعرض مواقيت الصلاة واتجاه القبلة.',
          NSLocationAlwaysUsageDescription: 'يحتاج طيبة إلى موقعك لعرض مواقيت الصلاة واتجاه القبلة.',
          NSMotionUsageDescription: 'يستخدم طيبة مستشعرات الجهاز لتحديد اتجاه القبلة.',
        },
        android: { app_name: variant.nameAr },
      },
      en: {
        ios: {
          CFBundleDisplayName: variant.name,
          NSLocationWhenInUseUsageDescription: 'Taybah needs your location to show prayer times and the qibla direction.',
          NSLocationAlwaysAndWhenInUseUsageDescription: 'Taybah needs your location to show prayer times and the qibla direction.',
          NSLocationAlwaysUsageDescription: 'Taybah needs your location to show prayer times and the qibla direction.',
          NSMotionUsageDescription: "Taybah uses your device's sensors to point you to the qibla.",
        },
        android: { app_name: variant.name },
      },
    },
    // Layout follows window size; no orientation lock anywhere (spec §4).
    orientation: 'default',
    // Home-screen mark: Nabawi dome logo (image (93).png → generate-brand-assets.mjs).
    // iOS uses this PNG; a Liquid Glass .icon would replace it.
    icon: './assets/images/icon.png',
    userInterfaceStyle: 'automatic',
    ios: {
      bundleIdentifier: variant.id,
      // ADR 0016 / ADR 0035: widgets and App Intents require iOS 16.4+; misbaha «+» uses iOS 17 AppIntent.
      deploymentTarget: '16.4',
      entitlements: {
        'com.apple.security.application-groups': [`group.${variant.id}`],
      },
      supportsTablet: true,
      infoPlist: {
        // All four iPad orientations and no full-screen requirement: needed for Split View and Stage Manager.
        'UISupportedInterfaceOrientations~ipad': [
          'UIInterfaceOrientationPortrait',
          'UIInterfaceOrientationPortraitUpsideDown',
          'UIInterfaceOrientationLandscapeLeft',
          'UIInterfaceOrientationLandscapeRight',
        ],
        UIRequiresFullScreen: false,
        // Playback continues with the screen locked (spec §12). The plugin adds the same key via expo-audio.
        UIBackgroundModes: ['audio'],
        // Arabic is the app's own default language, whatever the device language. At launch UIKit picks the
        // app's localization from AppleLanguages, which src/core/i18n/app-language.ts sets to the saved
        // language, among the bundled lproj folders (see `locales`); the development region is the fallback.
        // That localization drives the native chrome and natural text alignment, and it changes only on the
        // next cold start, so UiText and the search fields set their alignment explicitly.
        CFBundleDevelopmentRegion: 'ar',
        // iOS applies RTL only for languages the app declares.
        CFBundleLocalizations: ['ar', 'en'],
        CFBundleAllowMixedLocalizations: true,
        // HTTPS only through the OS, which is exempt; skips the export-compliance question per build.
        ITSAppUsesNonExemptEncryption: false,
        // Dev builds only: expo-dev-menu's floating button keeps its hit area at the top right under
        // RTL while drawing at the top left, so it swallows taps on the top-right Back button.
        // expo-dev-menu reads this key as its default; the dev menu still opens with a shake.
        ...(variantKey === 'development' && { EXDevMenuShowFloatingActionButton: false }),
      },
      // The app writes the widget snapshot to the App Group (1C8F.1); merged with the libraries' aggregated manifest.
      privacyManifests: {
        NSPrivacyAccessedAPITypes: [
          {
            NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
            NSPrivacyAccessedAPITypeReasons: ['CA92.1', '1C8F.1'],
          },
        ],
      },
    },
    android: {
      package: variant.id,
      adaptiveIcon: {
        backgroundColor: '#F9F7F2',
        // 1024×1024, logo in ~66% safe zone for the circular mask (see generate-brand-assets.mjs).
        foregroundImage: './assets/images/android-adaptive-foreground.png',
        // Android 13+ themed icon: the same logo as a white silhouette (generate-brand-assets.mjs).
        monochromeImage: './assets/images/android-adaptive-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      // Exact prayer and reminder alarms (ADR 0035 §5, prompt 12 builds the request flow). Not USE_EXACT_ALARM.
      permissions: ['android.permission.SCHEDULE_EXACT_ALARM'],
      // Not used by the app; library and template defaults that would otherwise ship (ADR 0058). Dev keeps the overlay permission.
      blockedPermissions: [
        'android.permission.ACTIVITY_RECOGNITION',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        ...(variantKey === 'production'
          ? ['android.permission.SYSTEM_ALERT_WINDOW', 'com.google.android.c2dm.permission.RECEIVE']
          : []),
      ],
    },
    plugins: [
      // Runs last among the mods (mods added first run last), so it overrides the library defaults for the purpose strings.
      ['./plugins/with-ios-purpose-strings.js', { production: variantKey === 'production' }],
      'expo-router',
      // Android status-bar icon: the logo as a white silhouette (an opaque icon shows as a white square), tinted brand.
      // Prayer notification sounds (ADR 0047): each file is copied into the iOS bundle and Android res/raw. The list
      // must match the catalogue in src/features/salah/data/adhan-sounds.ts (checked by adhan-assets.test.ts).
      [
        'expo-notifications',
        {
          icon: './assets/images/notification-icon.png',
          color: '#1F4D40',
          sounds: [
            './assets/adhan/allahu_akbar_short.wav',
            './assets/adhan/adhan_makkah.wav',
            './assets/adhan/adhan_madinah.wav',
          ],
        },
      ],

      [
        'expo-splash-screen',
        {
          backgroundColor: '#F9F7F2',
          // Solid cream poster (1440×3120); the Taybah mark animates in JS after launch.
          image: './assets/images/taybah-vertical-splash-screen.png',
          enableFullScreenImage_legacy: true,
          imageWidth: 390,
          resizeMode: 'cover',
          ios: {
            backgroundColor: '#F9F7F2',
            // iPad: portrait and landscape posters (2048×2732 / 2732×2048); storyboard picks tablet idiom.
            tabletBackgroundColor: '#F9F7F2',
            tabletImage: './assets/images/taybah-tablet-portrait-splash-screen.png',
          },
          // Android 12+ full-bleed poster is applied by withAndroidFullBleedSplash (below).
          android: {
            backgroundColor: '#F9F7F2',
            image: './assets/images/taybah-vertical-splash-screen.png',
            imageWidth: 390,
            resizeMode: 'cover',
          },
        },
      ],
      [
        './plugins/withAndroidFullBleedSplash',
        {
          backgroundColor: '#F9F7F2',
          portraitImage: './assets/images/taybah-vertical-splash-screen.png',
          landscapeImage: './assets/images/taybah-landscape-splash-screen.png',
          tabletPortraitImage: './assets/images/taybah-tablet-portrait-splash-screen.png',
          tabletLandscapeImage: './assets/images/taybah-tablet-landscape-splash-screen.png',
        },
      ],
      ['expo-localization', { supportsRTL: true }],
      // Prayer times and the qibla bearing (ADR 0030). Foreground only; no background tracking.
      [
        'expo-location',
        {
          locationWhenInUsePermission: 'يحتاج طيبة إلى موقعك لعرض مواقيت الصلاة واتجاه القبلة.',
        },
      ],
      // Release builds reload through expo-updates after a language change, and fetch OTA updates (see `updates`).
      'expo-updates',
      'expo-sqlite',
      'expo-font',
      // Background playback and lock-screen controls (Android foreground service). No recording, so no
      // microphone permission.
      [
        'expo-audio',
        { enableBackgroundPlayback: true, microphonePermission: false, recordAudioAndroid: false },
      ],
      // Android home-screen widgets (ADR 0035). Fonts are the widget faces; a name the widget asks for must have its file
      // here (`src/features/widgets/android/fonts.ts`, checked by a test).
      [
        'react-native-android-widget',
        {
          fonts: [
            './assets/fonts/IBMPlexSansArabic/IBMPlexSansArabic-Regular.ttf',
            './assets/fonts/IBMPlexSansArabic/IBMPlexSansArabic-Medium.ttf',
            './assets/fonts/IBMPlexSansArabic/IBMPlexSansArabic-SemiBold.ttf',
            './assets/fonts/IBMPlexSansArabic/IBMPlexSansArabic-Bold.ttf',
            './assets/fonts/Amiri/Amiri-Bold.ttf',
          ],
          // The picker label is a string resource, so the device language picks Arabic or English (see the plugin).
          widgets: ANDROID_WIDGETS.map((widget) => ({
            ...widget,
            label: `@string/widget_${widget.name.toLowerCase()}_label`,
          })),
        },
      ],
      // Gallery names in Arabic (values) and English (values-en), per widget (plugins/with-widget-gallery-strings.js).
      ['./plugins/with-widget-gallery-strings.js', { widgets: ANDROID_WIDGETS.map(({ name, label }) => ({ label, name })) }],
      // android/local.properties sdk.dir, rewritten on every prebuild (plugins/with-android-sdk-location.js).
      './plugins/with-android-sdk-location.js',
      // iOS home-screen widgets, lock-screen accessories, watch app and complications (ADR 0035).
      '@bacons/apple-targets',
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      eas: { projectId: 'e58e645e-5912-4da1-8ea8-7bdb73d93f64' },
    },
  };
};
