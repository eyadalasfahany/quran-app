import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { openContentDb } from '@/core/db/content/open';
import { formatNumber } from '@/core/i18n/numbers';
import { useLocale } from '@/core/i18n/useLocale';
import { getChapter } from '@/features/reader/data/chapters';
import { getVerseRange } from '@/features/reader/data/verses';
import { getWords } from '@/features/reader/data/words';

import type { AyahWord } from '../components/NowPlayingAyah';
import { recitationStyle } from '../data/reciters';
import { reciterInitial, recitationStyleKey, wordStates } from '../player-view';
import { usePlayerStore, type PlayerErrorCode } from '../playerStore';
import { usePlayerNames } from './usePlayerNames';

export type PlayerView = {
  artworkLetter: string;
  reciterName: string;
  surahName: string;
  styleLabel: string | null;
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  stepsEnabled: boolean;
  error: PlayerErrorCode | null;
  ayah: { words: AyahWord[]; counter: string; label: string } | null;
  versesCount: number;
  speed: number;
};

// Everything the full player shows, read once per change. Reads the content database only; the player's own
// state comes from playerStore. Nothing here touches personal data.
export function usePlayerView(): PlayerView {
  const { t } = useTranslation();
  const locale = useLocale();
  const status = usePlayerStore((state) => state.status);
  const chapterId = usePlayerStore((state) => state.chapterId);
  const positionMs = usePlayerStore((state) => state.positionMs);
  const durationMs = usePlayerStore((state) => state.durationMs);
  const error = usePlayerStore((state) => state.error);
  const activeVerseId = usePlayerStore((state) => state.activeVerseId);
  const activeWord = usePlayerStore((state) => state.activeWord);
  const speed = usePlayerStore((state) => state.speed);

  const db = useMemo(() => openContentDb().executor, []);
  const { reciter, reciterName, chapterName } = usePlayerNames();
  const chapter = useMemo(() => (chapterId === null ? undefined : getChapter(db, chapterId)), [db, chapterId]);

  const surahName = chapterName === null ? '' : t('player.surah', { name: chapterName });
  const styleKey = reciter === undefined ? null : recitationStyleKey(recitationStyle(db, reciter.resourceId));

  const verse = useMemo(() => {
    if (activeVerseId === null) {
      return undefined;
    }
    return getVerseRange(db, activeVerseId, activeVerseId)[0];
  }, [db, activeVerseId]);

  const ayah = useMemo(() => {
    if (verse === undefined || activeVerseId === null) {
      return null;
    }
    // The active word is an index into the ayah's word characters; ayah end marks are not part of the count.
    const words = getWords(db, activeVerseId).filter((word) => word.charType === 'word');
    const states = wordStates(words.length, activeWord);
    const number = formatNumber(verse.verseNumber, locale);
    const imlaei = words.map((word) => word.textImlaei).join(' ');
    return {
      words: words.map((word, index) => ({ text: word.textUthmani, state: states[index] ?? 'upcoming' })),
      counter: t('player.ayahCounter', { number, total: formatNumber(chapter?.versesCount ?? 0, locale) }),
      label: `${imlaei} ${t('ui.ayahNumber', { number })}`,
    };
  }, [activeVerseId, activeWord, chapter?.versesCount, db, locale, t, verse]);

  return {
    artworkLetter: reciterInitial(reciterName),
    reciterName,
    surahName,
    styleLabel: styleKey === null ? null : t(styleKey),
    isPlaying: status === 'playing' || status === 'loading',
    positionMs,
    durationMs,
    stepsEnabled: activeVerseId !== null,
    error,
    ayah,
    versesCount: chapter?.versesCount ?? 0,
    speed,
  };
}
