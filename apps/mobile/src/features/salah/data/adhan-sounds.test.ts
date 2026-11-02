import ar from '@/core/i18n/locales/ar.json';
import en from '@/core/i18n/locales/en.json';
import { storage, storageKeys } from '@/core/storage/mmkv';

import {
  ADHAN_VOICES,
  DEFAULT_PRAYER_SOUND,
  getPrayerSound,
  PRAYER_SOUND_IDS,
  prayerSoundName,
  setPrayerSoundValue,
} from './adhan-sounds';

/** Looks up a dotted key (`salah.prayerSound.makkah`) in a locale file. */
function lookup(locale: Record<string, unknown>, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => {
    if (typeof node === 'object' && node !== null) {
      return (node as Record<string, unknown>)[part];
    }
    return undefined;
  }, locale);
}

describe('adhan sound catalogue', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('defaults to the takbir voice when nothing is stored', () => {
    expect(DEFAULT_PRAYER_SOUND).toBe('allahu_akbar_short');
    expect(getPrayerSound()).toBe('allahu_akbar_short');
  });

  it('round-trips every sound id through storage', () => {
    for (const id of PRAYER_SOUND_IDS) {
      setPrayerSoundValue(id);

      expect(getPrayerSound()).toBe(id);
    }
    expect(storage.getString(storageKeys.salah.prayerSound)).toBe('silent');
  });

  it('falls back to the default when the stored value is unknown', () => {
    storage.set(storageKeys.salah.prayerSound, 'not-a-sound');

    expect(getPrayerSound()).toBe(DEFAULT_PRAYER_SOUND);
  });

  it('lists the voices first, then the system sound, then silent', () => {
    expect(PRAYER_SOUND_IDS).toEqual(['allahu_akbar_short', 'makkah', 'madinah', 'system', 'silent']);
  });

  it('gives every voice an id and a file that match the naming rules', () => {
    for (const voice of ADHAN_VOICES) {
      expect(voice.id).toMatch(/^[a-z0-9_]+$/);
      expect(voice.file).toMatch(/^[a-z0-9_]+\.wav$/);
    }
  });

  it('keeps every sound id unique', () => {
    expect(new Set(PRAYER_SOUND_IDS).size).toBe(PRAYER_SOUND_IDS.length);
    expect(new Set(ADHAN_VOICES.map((voice) => voice.file)).size).toBe(ADHAN_VOICES.length);
  });

  it('names every sound in Arabic and English', () => {
    for (const id of PRAYER_SOUND_IDS) {
      const key = prayerSoundName(id);

      expect(key).toBe(`salah.prayerSound.${id}`);
      expect(lookup(ar, key)).toEqual(expect.any(String));
      expect(lookup(en, key)).toEqual(expect.any(String));
    }
  });
});
