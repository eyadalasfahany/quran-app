import type { PlayerErrorCode } from './playerStore';

export const SEEK_STEP_MS = 10_000;

/**
 * The letter on a reciter's tile: the family name's initial, without the article. The frames draw «ع» for
 * مشاري راشد العفاسي and «ص» for عبد الباسط عبد الصمد; in English the transliterated article goes too
 * ("al-`Afasy" gives "A", "ash-Shuraym" gives "S").
 */
export function reciterInitial(name: string): string {
  const family = name.trim().split(/\s+/).at(-1) ?? '';
  const bare = family.replace(/^ال(?=\p{L}{2})/u, '').replace(/^a(?:l|[dnrstz]h?)-/iu, '');
  return bare.match(/\p{L}/u)?.[0]?.toLocaleUpperCase() ?? '';
}

// QF sends the style in English. The labels are i18n keys; an unknown style has none, and the pill hides.
const STYLE_KEYS = {
  Murattal: 'player.style.murattal',
  Mujawwad: 'player.style.mujawwad',
  Muallim: 'player.style.muallim',
} as const;

export type RecitationStyleKey = (typeof STYLE_KEYS)[keyof typeof STYLE_KEYS];

export function recitationStyleKey(style: string | null | undefined): RecitationStyleKey | null {
  if (style === null || style === undefined) {
    return null;
  }
  return Object.prototype.hasOwnProperty.call(STYLE_KEYS, style) ? STYLE_KEYS[style as keyof typeof STYLE_KEYS] : null;
}

export const ERROR_KEYS = {
  'no-reciter': 'player.errors.noReciter',
  'not-installed': 'player.errors.notInstalled',
  'surah-unavailable': 'player.errors.surahUnavailable',
  'load-failed': 'player.errors.loadFailed',
  'not-found': 'player.errors.notFound',
  'invalid-chapter': 'player.errors.invalidChapter',
  'invalid-verse': 'player.errors.invalidVerse',
  offline: 'player.errors.offline',
  'verify-required': 'player.errors.verifyRequired',
} as const satisfies Record<PlayerErrorCode, string>;

export type ErrorKey = (typeof ERROR_KEYS)[PlayerErrorCode];

/** Played share of the file, 0 to 1. Unknown duration (0) means nothing is played yet. */
export function playbackFraction(positionMs: number, durationMs: number): number {
  if (durationMs <= 0 || !Number.isFinite(positionMs)) {
    return 0;
  }
  return Math.min(1, Math.max(0, positionMs / durationMs));
}

/** The position after a step of `deltaMs`, kept between 0 and the duration. Without a duration it stays at 0. */
export function steppedPosition(positionMs: number, deltaMs: number, durationMs: number): number {
  if (durationMs <= 0) {
    return 0;
  }
  return Math.min(durationMs, Math.max(0, positionMs + deltaMs));
}

export type WordState = 'recited' | 'current' | 'upcoming';

/**
 * Words before the active one are recited, the active one is current, the rest are still to come. `activeWord` is the engine's word position, 1-based as QF numbers segments, so word 1 is
 * index 0. (Reading it as an index lit the next word: the first word never showed, and the highlight ran a
 * word ahead of the voice.)
 */
export function wordStates(count: number, activeWord: number | null): WordState[] {
  const current = activeWord === null ? null : activeWord - 1;
  return Array.from({ length: count }, (_, index) => {
    if (current === null) {
      return 'upcoming';
    }
    if (index < current) {
      return 'recited';
    }
    return index === current ? 'current' : 'upcoming';
  });
}

/** The fraction after a drag of `dx` points from `startFraction`. In Arabic the track runs right to left, so a drag left moves forward. */
export function fractionAfterDrag(startFraction: number, dx: number, width: number, rtl: boolean): number {
  if (width <= 0) {
    return startFraction;
  }
  const direction = rtl ? -1 : 1;
  return Math.min(1, Math.max(0, startFraction + (direction * dx) / width));
}
