import type { ConfigContext, ExpoConfig } from 'expo/config';

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
    version: '1.0.0',
    scheme: variant.scheme,
    // The home-screen name follows the device language.
    locales: {
      ar: { ios: { CFBundleDisplayName: variant.nameAr }, android: { app_name: variant.nameAr } },
    },
    // Layout follows window size; no orientation lock anywhere (spec §4).
    orientation: 'default',
    // Home-screen mark, cropped from the logo so the Kaaba stays inside the icon mask.
    // iOS uses this PNG; a Liquid Glass .icon would replace it.
    icon: './assets/images/icon.png',
    userInterfaceStyle: 'automatic',
    ios: {
      bundleIdentifier: variant.id,
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
        // Arabic is the app's own default language, whatever the device language. UIKit takes its
        // layout direction (and the native tab bar order) from the app's development region and
        // declared localizations, so the native chrome mirrors even on an English device.
        // The per-launch language itself is set at runtime (src/core/i18n/app-language.ts).
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
    },
    android: {
      package: variant.id,
      adaptiveIcon: {
        backgroundColor: '#E9DED0',
        foregroundImage: './assets/images/icon.png',
      },
      predictiveBackGestureEnabled: false,
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          backgroundColor: '#1F4D40',
          image: './assets/images/taybah-vertical-splash-screen.png',
          imageWidth: 390,
          resizeMode: 'contain',
          // Android 12 draws the splash inside a circle. The full poster would lose its corners,
          // so Android uses the same mark as the home-screen icon.
          android: {
            backgroundColor: '#1F4D40',
            image: './assets/images/icon.png',
            imageWidth: 192,
          },
        },
      ],
      ['expo-localization', { supportsRTL: true }],
      // Release builds reload through expo-updates after a language change.
      // No update URL until EAS exists, so this does not check for remote updates.
      'expo-updates',
      'expo-sqlite',
      'expo-font',
      // Background playback and lock-screen controls (Android foreground service). No recording, so no
      // microphone permission.
      [
        'expo-audio',
        { enableBackgroundPlayback: true, microphonePermission: false, recordAudioAndroid: false },
      ],
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
