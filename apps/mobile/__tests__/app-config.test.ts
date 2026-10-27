import type { ExpoConfig } from 'expo/config';

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
    ['development', 'com.example.quran.dev', 'quran-dev'],
    ['preview', 'com.example.quran.preview', 'quran-preview'],
    ['production', 'com.example.quran', 'quran'],
  ])('uses the %s bundle id and scheme', (variant: string, id: string, scheme: string) => {
    const config = configFor(variant);

    expect(config.ios?.bundleIdentifier).toBe(id);
    expect(config.android?.package).toBe(id);
    expect(config.scheme).toBe(scheme);
  });

  it('defaults to development when APP_VARIANT is unset', () => {
    expect(configFor(undefined).ios?.bundleIdentifier).toBe('com.example.quran.dev');
  });

  it('rejects an unknown variant', () => {
    expect(() => configFor('staging')).toThrow('Unknown APP_VARIANT "staging"');
  });

  it('never locks orientation and declares every iPad orientation', () => {
    const config = configFor('production');

    expect(config.orientation).toBe('default');
    expect(config.ios?.supportsTablet).toBe(true);
    expect(config.ios?.infoPlist?.['UISupportedInterfaceOrientations~ipad']).toHaveLength(4);
    expect(config.ios?.infoPlist?.UIRequiresFullScreen).toBe(false);
  });

  it('keeps RTL support on', () => {
    expect(configFor('production').plugins).toContainEqual(['expo-localization', { supportsRTL: true }]);
  });

  it('installs expo-updates without a remote update url', () => {
    const config = configFor('production');

    expect(config.plugins).toContain('expo-updates');
    expect(config.updates?.url).toBeUndefined();
  });
});
