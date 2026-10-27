import { render } from '@testing-library/react-native';
import * as Updates from 'expo-updates';
import { useTranslation } from 'react-i18next';
import { DevSettings, I18nManager, Text } from 'react-native';

import { setDeviceLanguageCode } from '../jest/device-language';
import ar from '../src/core/i18n/locales/ar.json';
import en from '../src/core/i18n/locales/en.json';
import { reloadApp } from '@/core/i18n/direction';
import { ensureDirection, formatNumber, getLocale, i18n, setLocale } from '@/core/i18n';
import { storage, storageKeys } from '@/core/storage/mmkv';

function leafKeys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return [prefix];
  }
  return Object.entries(value).flatMap(([key, child]) => leafKeys(child, prefix ? `${prefix}.${key}` : key));
}

function leaves(value: unknown): unknown[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return [value];
  }
  return Object.values(value).flatMap(leaves);
}

function HomeLabel() {
  const { t } = useTranslation();
  return <Text>{t('tabs.home')}</Text>;
}

describe('string catalogs', () => {
  it('gives Arabic and English the same keys', () => {
    expect(leafKeys(ar).sort()).toEqual(leafKeys(en).sort());
    expect(leafKeys(ar).length).toBeGreaterThan(0);
  });

  it('keeps every string non-empty', () => {
    for (const value of [...leaves(ar), ...leaves(en)]) {
      expect(typeof value).toBe('string');
      expect(value).not.toBe('');
    }
  });
});

describe('locale', () => {
  beforeEach(() => {
    storage.clearAll();
    setDeviceLanguageCode('en');
    I18nManager.isRTL = false;
  });

  it('uses Arabic when nothing is saved, even on an English device', () => {
    expect(getLocale()).toBe('ar');

    setDeviceLanguageCode('fr');
    expect(getLocale()).toBe('ar');

    setDeviceLanguageCode(null);
    expect(getLocale()).toBe('ar');
  });

  it('uses English only once the reader has saved it', () => {
    storage.set(storageKeys.locale, 'en');

    expect(getLocale()).toBe('en');
  });

  it('prefers the saved language over the device language', () => {
    storage.set(storageKeys.locale, 'ar');
    setDeviceLanguageCode('en');

    expect(getLocale()).toBe('ar');
  });

  it('ignores a saved value that is not a supported language', () => {
    storage.set(storageKeys.locale, 'fr');
    setDeviceLanguageCode('en');

    expect(getLocale()).toBe('ar');
  });
});

describe('direction', () => {
  let allowRTL: jest.SpiedFunction<typeof I18nManager.allowRTL>;
  let forceRTL: jest.SpiedFunction<typeof I18nManager.forceRTL>;
  const reload = jest.mocked(DevSettings.reload);

  beforeEach(async () => {
    storage.clearAll();
    setDeviceLanguageCode('en');
    I18nManager.isRTL = false;
    allowRTL = jest.spyOn(I18nManager, 'allowRTL').mockImplementation(() => {});
    forceRTL = jest.spyOn(I18nManager, 'forceRTL').mockImplementation(() => {});
    reload.mockClear();
    jest.mocked(Updates.reloadAsync).mockClear();
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not reload when the language already matches the layout direction', () => {
    setLocale('en');

    expect(getLocale()).toBe('en');
    expect(forceRTL).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('forces RTL and reloads in dev when switching to Arabic', () => {
    setLocale('ar');

    expect(getLocale()).toBe('ar');
    expect(allowRTL).toHaveBeenCalledWith(true);
    expect(forceRTL).toHaveBeenCalledWith(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(Updates.reloadAsync).not.toHaveBeenCalled();
  });

  it('turns RTL off and reloads in dev when switching to English', () => {
    I18nManager.isRTL = true;

    setLocale('en');

    expect(allowRTL).toHaveBeenCalledWith(false);
    expect(forceRTL).toHaveBeenCalledWith(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('reloads on startup when the saved language and the layout direction disagree', () => {
    storage.set(storageKeys.locale, 'ar');

    expect(ensureDirection().ready).toBe(false);
    expect(allowRTL).toHaveBeenCalledWith(true);
    expect(forceRTL).toHaveBeenCalledWith(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('leaves startup alone when the layout direction already matches', () => {
    storage.set(storageKeys.locale, 'en');

    expect(ensureDirection().ready).toBe(true);
    expect(forceRTL).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('reloads only once when the direction still disagrees after the reload', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    storage.set(storageKeys.locale, 'ar');

    expect(ensureDirection().ready).toBe(false);
    // The next launch still reports LTR: show the app instead of reloading again.
    expect(ensureDirection().ready).toBe(true);

    expect(reload).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(storage.contains(storageKeys.directionReloadPending)).toBe(false);
  });

  it('clears the reload marker once the direction matches', () => {
    storage.set(storageKeys.locale, 'ar');

    expect(ensureDirection().ready).toBe(false);
    I18nManager.isRTL = true;

    expect(ensureDirection().ready).toBe(true);
    expect(storage.contains(storageKeys.directionReloadPending)).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does not reload again on startup after a language switch that did not apply', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    setLocale('ar');
    expect(ensureDirection().ready).toBe(true);

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('reloads a release build through expo-updates', async () => {
    await expect(reloadApp(false)).resolves.toBe(true);

    expect(Updates.reloadAsync).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
  });

  it('reports a failed release reload instead of throwing', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.mocked(Updates.reloadAsync).mockRejectedValueOnce(new Error('reload unavailable'));

    await expect(reloadApp(false)).resolves.toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('hands startup the pending reload so it can show the app if the reload fails', async () => {
    storage.set(storageKeys.locale, 'ar');

    const check = ensureDirection();

    expect(check.ready).toBe(false);
    await expect(check.ready ? undefined : check.reload).resolves.toBe(true);
  });
});

describe('translations', () => {
  beforeEach(async () => {
    storage.clearAll();
    setDeviceLanguageCode('en');
    await i18n.changeLanguage('en');
  });

  it('returns the catalog string for the active language', async () => {
    expect(i18n.t('tabs.myQuran')).toBe('My Quran');

    await i18n.changeLanguage('ar');

    expect(i18n.t('tabs.myQuran')).toBe('مصحفي');
    expect(i18n.t('nav.main')).toBe('التنقل الرئيسي');
  });

  it('renders the Arabic string through react-i18next', async () => {
    await i18n.changeLanguage('ar');

    const { getByText } = await render(<HomeLabel />);

    expect(getByText('الرئيسية')).toBeOnTheScreen();
  });
});

describe('numbers', () => {
  beforeEach(() => {
    storage.clearAll();
    setDeviceLanguageCode('en');
  });

  it('keeps Western digits in English and uses Arabic-Indic digits in Arabic', () => {
    expect(formatNumber(2026, 'en')).toBe('2026');
    expect(formatNumber(-12.5, 'ar')).toBe('-١٢٫٥');
  });

  it('follows the saved language when no locale is passed', () => {
    storage.set(storageKeys.locale, 'ar');

    expect(formatNumber(7)).toBe('٧');
  });
});
