import type { ConfigContext, ExpoConfig } from 'expo/config';

// APP_VARIANT is set per EAS build profile (eas.json). Local runs default to development.
const VARIANTS = {
  development: { id: 'com.example.quran.dev', name: 'Quran (Dev)', scheme: 'quran-dev' },
  preview: { id: 'com.example.quran.preview', name: 'Quran (Preview)', scheme: 'quran-preview' },
  production: { id: 'com.example.quran', name: 'Quran', scheme: 'quran' },
} as const;

type Variant = keyof typeof VARIANTS;

function resolveVariant(value: string | undefined): Variant {
  const variant = value ?? 'development';
  if (!(variant in VARIANTS)) {
    throw new Error(`Unknown APP_VARIANT "${variant}". Use development, preview or production.`);
  }
  return variant as Variant;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = VARIANTS[resolveVariant(process.env.APP_VARIANT)];

  return {
    ...config,
    name: variant.name,
    slug: 'quran',
    version: '1.0.0',
    scheme: variant.scheme,
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
        // iOS applies RTL only for languages the app declares.
        CFBundleLocalizations: ['ar', 'en'],
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
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  };
};
