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
  topInset = 0,
  onVerseChange,
  onOpenActions,
}: {
  verseKey: string;
  fontScale?: number;
  highlightsByVerseId?: ReadonlyMap<number, HighlightColor>;
  topInset?: number;
  onVerseChange: (verseKey: string) => void;
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

  return (
    <FocusStage
      fontScale={fontScale}
      highlightColor={highlightsByVerseId?.get(verse.id) ?? null}
      nextNumber={next?.verseNumber ?? null}
      nextText={next?.textUthmani ?? null}
      topInset={topInset}
      onNext={next === undefined ? undefined : () => onVerseChange(next.verseKey)}
      onOpenActions={onOpenActions === undefined ? undefined : () => onOpenActions(verse.verseKey)}
      onPrevious={previous === undefined ? undefined : () => onVerseChange(previous.verseKey)}
      onSelectVerse={(number) => onVerseChange(neighbourKey(verse.chapterId, number))}
      previousNumber={previous?.verseNumber ?? null}
      previousText={previous?.textUthmani ?? null}
      textImlaei={verse.textImlaei}
      textUthmani={verse.textUthmani}
      verseNumber={verse.verseNumber}
      versesCount={chapter.versesCount}
    />
  );
}
