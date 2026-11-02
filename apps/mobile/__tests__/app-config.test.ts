import type { ExpoConfig } from '@expo/config-types';

import appConfig from '../app.config';

function setVariant(variant: string | undefined): void {
  if (variant === undefined) {
    delete process.env.APP_VARIANT;
  } else {
    process.env.APP_VARIANT = variant;
  }
}

function configFor(variant: string | undefined): ExpoConfig {
  const previous = process.env.APP_VARIANT;
  setVariant(variant);
  try {
    return appConfig({ config: {} } as Parameters<typeof appConfig>[0]);
  } finally {
    setVariant(previous);
  }
}

describe('app.config', () => {
  it.each([
    ['development', 'com.taybahapp.taybah.dev', 'taybah-dev'],
    ['production', 'com.taybahapp.taybah', 'taybah'],
  ])('uses the %s bundle id and scheme', (variant: string, id: string, scheme: string) => {
    const config = configFor(variant);

    expect(config.ios?.bundleIdentifier).toBe(id);
    expect(config.android?.package).toBe(id);
    expect(config.scheme).toBe(scheme);
  });

  it('defaults to development when APP_VARIANT is unset', () => {
    expect(configFor(undefined).ios?.bundleIdentifier).toBe('com.taybahapp.taybah.dev');
  });

  it('bundles google-services.json for production Android only', () => {
    expect(configFor('production').android?.googleServicesFile).toBe('./google-services.json');
    expect(configFor('development').android?.googleServicesFile).toBeUndefined();
  });

  it('uses the Taybah mark for the icon and a cream launch poster for the splash', () => {
    const config = configFor('production');

    expect(config.icon).toBe('./assets/images/icon.png');
    expect(config.ios?.icon).toBeUndefined();
    expect(config.android?.adaptiveIcon).toEqual({
      backgroundColor: '#F9F7F2',
      foregroundImage: './assets/images/android-adaptive-foreground.png',
    });
    expect(config.plugins).toContainEqual([
      'expo-splash-screen',
      {
        backgroundColor: '#F9F7F2',
        image: './assets/images/taybah-vertical-splash-screen.png',
        enableFullScreenImage_legacy: true,
        imageWidth: 390,
        resizeMode: 'cover',
        ios: {
          backgroundColor: '#F9F7F2',
          tabletBackgroundColor: '#F9F7F2',
          tabletImage: './assets/images/taybah-tablet-portrait-splash-screen.png',
        },
        android: {
          backgroundColor: '#F9F7F2',
          image: './assets/images/taybah-vertical-splash-screen.png',
          imageWidth: 390,
          resizeMode: 'cover',
        },
      },
    ]);
    expect(config.plugins?.some((entry) => Array.isArray(entry) && entry[1]?.landscapeImage != null)).toBe(
      true,
    );
  });

  it('names the app Taybah, and طيبة on Arabic devices', () => {
    const config = configFor('production');

    expect(config.name).toBe('Taybah');
    expect(config.locales?.ar).toEqual({
      ios: { CFBundleDisplayName: 'طيبة' },
      android: { app_name: 'طيبة' },
    });
  });

  // TestFlight and the store share the production variant (ADR 0016).
  it.each(['staging', 'preview'])('rejects the unknown variant %s', (variant: string) => {
    expect(() => configFor(variant)).toThrow(`Unknown APP_VARIANT "${variant}"`);
  });

  it('links the EAS project and skips the export-compliance question', () => {
    const config = configFor('production');

    expect(config.owner).toBe('themayman');
    expect(config.extra?.eas?.projectId).toBe('e58e645e-5912-4da1-8ea8-7bdb73d93f64');
    expect(config.ios?.infoPlist?.ITSAppUsesNonExemptEncryption).toBe(false);
  });

  it('never locks orientation and declares every iPad orientation', () => {
    const config = configFor('production');

    expect(config.orientation).toBe('default');
    expect(config.ios?.supportsTablet).toBe(true);
    expect(config.ios?.infoPlist?.['UISupportedInterfaceOrientations~ipad']).toHaveLength(4);
    expect(config.ios?.infoPlist?.UIRequiresFullScreen).toBe(false);
  });

  it('declares Arabic as the iOS development region and both languages, with mixed localizations', () => {
    const infoPlist = configFor('production').ios?.infoPlist;

    expect(infoPlist?.CFBundleDevelopmentRegion).toBe('ar');
    expect(infoPlist?.CFBundleLocalizations).toEqual(['ar', 'en']);
    expect(infoPlist?.CFBundleAllowMixedLocalizations).toBe(true);
  });

  it('hides the dev-menu floating button in development builds only', () => {
    expect(configFor('development').ios?.infoPlist?.EXDevMenuShowFloatingActionButton).toBe(false);
    expect(configFor('production').ios?.infoPlist).not.toHaveProperty('EXDevMenuShowFloatingActionButton');
  });

  it('keeps RTL support on', () => {
    expect(configFor('production').plugins).toContainEqual(['expo-localization', { supportsRTL: true }]);
  });

  it('checks EAS Update on launch without blocking it', () => {
    const config = configFor('production');

    expect(config.plugins).toContain('expo-updates');

    expect(config.runtimeVersion).toEqual({ policy: 'fingerprint' });
    expect(config.updates).toEqual({
      url: 'https://u.expo.dev/e58e645e-5912-4da1-8ea8-7bdb73d93f64',
      checkAutomatically: 'ON_LOAD',
      fallbackToCacheTimeout: 0,
    });
  });

  it('plays audio in the background on iOS', () => {
    expect(configFor('production').ios?.infoPlist?.UIBackgroundModes).toEqual(['audio']);
  });

  it('configures expo-audio for background playback without microphone access', () => {
    expect(configFor('production').plugins).toContainEqual([
      'expo-audio',
      { enableBackgroundPlayback: true, microphonePermission: false, recordAudioAndroid: false },
    ]);
  });
});
