import { formatNumber } from '@/core/i18n/numbers';
import type { Locale } from '@/core/i18n/locale';

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
  'load-failed': 'player.errors.loadFailed',
  'not-found': 'player.errors.notFound',
  'invalid-chapter': 'player.errors.invalidChapter',
  'invalid-verse': 'player.errors.invalidVerse',
} as const satisfies Record<PlayerErrorCode, string>;

export type ErrorKey = (typeof ERROR_KEYS)[PlayerErrorCode];

/** m:ss with Arabic-Indic digits in Arabic. Zero renders as 0:00, so the labels show before a duration is known. */
export function formatClock(ms: number, locale: Locale): string {
  const totalSeconds = Math.max(0, Math.floor((Number.isFinite(ms) ? ms : 0) / 1000));
  const minutes = formatNumber(Math.floor(totalSeconds / 60), locale);
  const seconds = formatNumber(totalSeconds % 60, locale).padStart(2, formatNumber(0, locale));
  return `${minutes}:${seconds}`;
}

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

/** Words before the active one are recited, the active one is current, the rest are still to come. */
export function wordStates(count: number, activeWord: number | null): WordState[] {
  return Array.from({ length: count }, (_, index) => {
    if (activeWord === null) {
      return 'upcoming';
    }
    if (index < activeWord) {
      return 'recited';
    }
    return index === activeWord ? 'current' : 'upcoming';
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
