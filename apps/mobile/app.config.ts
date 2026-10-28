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
  const variant = VARIANTS[resolveVariant(process.env.APP_VARIANT)];

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
    icon: './assets/images/icon.png',
    userInterfaceStyle: 'automatic',
    ios: {
      bundleIdentifier: variant.id,
      icon: './assets/expo.icon',
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
      },
    },
    android: {
      package: variant.id,
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          backgroundColor: '#208AEF',
          image: './assets/images/splash-icon.png',
          imageWidth: 76,
        },
      ],
      ['expo-localization', { supportsRTL: true }],
      // Release builds reload through expo-updates after a language change.
      // No update URL until EAS exists, so this does not check for remote updates.
      'expo-updates',
      'expo-sqlite',
      'expo-font',
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
