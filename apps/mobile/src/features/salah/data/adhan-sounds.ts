import { storage, storageKeys } from '@/core/storage/mmkv';

/**
 * The prayer notification sounds (ADR 0047). The user picks one global sound for all five prayers: an adhan voice from
 * the bundled catalogue, the system sound, or silence. Each voice is a short takbīr clip shipped in the binary (the
 * `sounds` list of the expo-notifications plugin in `app.config.ts`); a voice id is the stable key of its Android channel.
 */

export type AdhanVoiceId = 'allahu_akbar_short' | 'makkah' | 'madinah';

export type PrayerSoundId = AdhanVoiceId | 'system' | 'silent';

export interface AdhanVoice {
  id: AdhanVoiceId;
  /** The bundled file name with extension, under `apps/mobile/assets/adhan/`. */
  file: string;
}

export const ADHAN_VOICES = [
  { id: 'allahu_akbar_short', file: 'allahu_akbar_short.wav' },
  { id: 'makkah', file: 'adhan_makkah.wav' },
  { id: 'madinah', file: 'adhan_madinah.wav' },
] as const satisfies readonly AdhanVoice[];

export const PRAYER_SOUND_IDS: readonly PrayerSoundId[] = [
  ...ADHAN_VOICES.map((voice) => voice.id),
  'system',
  'silent',
];

export const DEFAULT_PRAYER_SOUND: PrayerSoundId = 'allahu_akbar_short';

function isPrayerSoundId(value: string): value is PrayerSoundId {
  return (PRAYER_SOUND_IDS as readonly string[]).includes(value);
}

/** The chosen prayer sound. A missing or unknown stored value falls back to the default voice. */
export function getPrayerSound(): PrayerSoundId {
  const stored = storage.getString(storageKeys.salah.prayerSound);
  return stored !== undefined && isPrayerSoundId(stored) ? stored : DEFAULT_PRAYER_SOUND;
}

export function setPrayerSoundValue(id: PrayerSoundId): void {
  storage.set(storageKeys.salah.prayerSound, id);
}

/** The i18n key of a sound's name in the picker, e.g. `salah.prayerSound.makkah`. */
export function prayerSoundName(id: PrayerSoundId): `salah.prayerSound.${PrayerSoundId}` {
  return `salah.prayerSound.${id}`;
}

/** The bundled file of a voice. Every `AdhanVoiceId` is in the catalogue, so this always finds one. */
export function adhanVoiceFile(id: AdhanVoiceId): string {
  const voice = ADHAN_VOICES.find((item) => item.id === id);
  return voice?.file ?? ADHAN_VOICES[0].file;
}
