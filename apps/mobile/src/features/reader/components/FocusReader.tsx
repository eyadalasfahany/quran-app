import { useMemo } from 'react';

import { openContentDb } from '@/core/db/content/open';
import type { HighlightColor } from '@/shared/ui';

import { getChapter } from '../data/chapters';
import { getVerseByKey } from '../data/verses';
import { FocusStage } from './FocusStage';

function neighbourKey(chapterId: number, verseNumber: number): string {
  return `${chapterId}:${verseNumber}`;
}

export function FocusReader({
  verseKey,
  fontScale = 1,
  highlightsByVerseId,
  recitedVerseKey = null,
  activeWord = null,
  following = false,
  playing = false,
  onPlay,
  topInset = 0,
  onVerseChange,
  onStep,
  onUserMove,
  onUserMoveEnd,
  onOpenActions,
}: {
  verseKey: string;
  fontScale?: number;
  highlightsByVerseId?: ReadonlyMap<number, HighlightColor>;
  /** The ayah being recited, and its recited word. */
  recitedVerseKey?: string | null;
  activeWord?: number | null;
  /** The reader follows the recitation: the stage keeps the recited word in view. */
  following?: boolean;
  playing?: boolean;
  onPlay?: () => void;
  topInset?: number;
  onVerseChange: (verseKey: string) => void;
  /** A previous or next step (button or swipe): lets the reader move the recitation too. */
  onStep?: (verseKey: string, way: 'next' | 'previous') => void;
  /** The reader moved by hand (step, swipe or progress): following pauses. */
  onUserMove?: () => void;
  onUserMoveEnd?: () => void;
  onOpenActions?: (verseKey: string) => void;
}) {
  const stage = useMemo(() => {
    try {
      const db = openContentDb().executor;
      const verse = getVerseByKey(db, verseKey);
      if (verse === undefined) {
        return null;
      }
      const chapter = getChapter(db, verse.chapterId);
      if (chapter === undefined) {
        return null;
      }
      const previous =
        verse.verseNumber > 1 ? getVerseByKey(db, neighbourKey(verse.chapterId, verse.verseNumber - 1)) : undefined;
      const next =
        verse.verseNumber < chapter.versesCount
          ? getVerseByKey(db, neighbourKey(verse.chapterId, verse.verseNumber + 1))
          : undefined;
      return { chapter, next, previous, verse };
    } catch {
      return null;
    }
  }, [verseKey]);

  if (stage === null) {
    return null;
  }

  const { chapter, next, previous, verse } = stage;
  const moveTo = (key: string, way: 'next' | 'previous' | null) => {
    onUserMove?.();
    onUserMoveEnd?.();
    if (way !== null) {
      onStep?.(key, way);
    }
    onVerseChange(key);
  };

  return (
    <FocusStage
      activeWord={verse.verseKey === recitedVerseKey ? activeWord : null}
      fontScale={fontScale}
      following={following}
      highlightColor={highlightsByVerseId?.get(verse.id) ?? null}
      nextNumber={next?.verseNumber ?? null}
      nextText={next?.textUthmani ?? null}
      onDragFinish={onUserMoveEnd}
      onDragStart={onUserMove}
      onNext={next === undefined ? undefined : () => moveTo(next.verseKey, 'next')}
      onOpenActions={onOpenActions === undefined ? undefined : () => onOpenActions(verse.verseKey)}
      onPlay={onPlay}
      onPrevious={previous === undefined ? undefined : () => moveTo(previous.verseKey, 'previous')}
      onSelectVerse={(number) => moveTo(neighbourKey(verse.chapterId, number), null)}
      playing={playing}
      previousNumber={previous?.verseNumber ?? null}
      previousText={previous?.textUthmani ?? null}
      recited={verse.verseKey === recitedVerseKey}
      textImlaei={verse.textImlaei}
      textUthmani={verse.textUthmani}
      verseNumber={verse.verseNumber}
      versesCount={chapter.versesCount}
    />
  );
}
