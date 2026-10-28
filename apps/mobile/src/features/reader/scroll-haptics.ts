import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';

import type { ReaderMode } from './anchor/reading-anchor';

export type ScrollHaptic = 'ayah' | 'surah';

export const SCROLL_HAPTIC_MIN_INTERVAL_MS = 80;

function surahOf(verseKey: string): number {
  return Number(verseKey.split(':')[0]);
}

export function createScrollHaptics(play: (kind: ScrollHaptic) => void, now: () => number = Date.now) {
  let verseKey: string | null = null;
  let page: number | null = null;
  let lastFiredAt: number | null = null;

  const fire = (kind: ScrollHaptic) => {
    const at = now();
    if (lastFiredAt !== null && at - lastFiredAt < SCROLL_HAPTIC_MIN_INTERVAL_MS) {
      return;
    }
    lastFiredAt = at;
    play(kind);
  };

  return {
    onVerse(key: string): void {
      const previous = verseKey;
      verseKey = key;
      if (previous === null || previous === key) {
        return;
      }
      fire(surahOf(key) !== surahOf(previous) ? 'surah' : 'ayah');
    },
    onPage(nextPage: number, startsSurah: boolean): void {
      const previous = page;
      page = nextPage;
      if (previous === null || previous === nextPage) {
        return;
      }
      if (startsSurah) {
        fire('surah');
      }
    },
    reset(): void {
      verseKey = null;
      page = null;
    },
  };
}

function playScrollHaptic(kind: ScrollHaptic): void {
  if (kind === 'surah') {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    return;
  }
  void Haptics.selectionAsync().catch(() => undefined);
}

export function useScrollHaptics(mode: ReaderMode) {
  const [haptics] = useState(() => createScrollHaptics(playScrollHaptic));

  useEffect(() => {
    haptics.reset();
  }, [haptics, mode]);

  return { onVerse: haptics.onVerse, onPage: haptics.onPage };
}
