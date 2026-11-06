import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View, type HostInstance } from 'react-native';

import { formatNumber, type Locale } from '@/core/i18n';
import type { SqlExecutor } from '@/core/db/sql-executor';
import { PageDivider, type HighlightColor } from '@/shared/ui';

import type { ChapterRecord } from '../data/chapters';
import { getVersesByPage } from '../data/verses';
import { lineForOffset, type TextLine } from '../word-follow';
import { measureWithin } from '../measure-within';
import { paragraphVerseRanges, type SurahRun } from '../mushaf-paragraph';
import type { WordFollow } from '../useWordFollow';
import { HafsMushafPage } from './HafsMushafPage';

// One page of the Tanzil (Hafs) Mushaf in the list, led by the break from the page before it.
export function HafsPage({
  page,
  executor,
  chapters,
  fontScale,
  recitedVerseKey = null,
  recitedWord = null,
  highlightsByVerseId,
  khatmaMarkerVerseId = null,
  placeVerseKey = null,
  onSelectVerseKey,
  onOpenAyahActions,
  focusVerseKey = null,
  onFocusOffset,
  onRunMeasured,
  follow,
  followKey = null,
  onRootNode,
  testID,
}: {
  page: number;
  executor: SqlExecutor;
  chapters: ReadonlyMap<number, ChapterRecord>;
  fontScale: number;
  /** The ayah the player is reciting. */
  recitedVerseKey?: string | null;
  recitedWord?: number | null;
  highlightsByVerseId?: ReadonlyMap<number, HighlightColor>;
  khatmaMarkerVerseId?: number | null;
  /** The reader's place, washed in Mushaf until the first drag (ADR 0070). */
  placeVerseKey?: string | null;
  onSelectVerseKey?: (verseKey: string) => void;
  onOpenAyahActions?: (verseKey: string) => void;
  /** The ayah the reader opened at, when it is on this page. */
  focusVerseKey?: string | null;
  /** How far below the top of this page the surah paragraph holding that ayah starts. */
  onFocusOffset?: (page: number, offset: number) => void;
  /** A paragraph's lines, once measured: its top on screen inside the page's root (ADR 0073). */
  onRunMeasured?: (page: number, measured: { run: SurahRun; lines: readonly TextLine[]; textTop: number }) => void;
  /** The word follow-scroll, and the followed ayah: its paragraph's Text reports its lines to the follow. */
  follow?: WordFollow;
  followKey?: string | null;
  /** The page's root node, which the follow measures the followed paragraph against. */
  onRootNode?: (node: HostInstance | null) => void;
  testID?: string;
}) {
  const rootRef = useRef<HostInstance>(null);
  const { t, i18n } = useTranslation();
  const locale: Locale = i18n.language === 'en' ? 'en' : 'ar';
  const verses = useMemo(() => getVersesByPage(executor, page), [executor, page]);
  const juz = verses[0]?.juz ?? 1;
  // A surah's first ayah keeps the run path: its surah title is drawn above the paragraph, so the list shows it.
  const measureFocus = (run: HostInstance | null) => {
    if (run === null || rootRef.current === null || onFocusOffset === undefined) {
      return;
    }
    const focus = verses.find((verse) => verse.verseKey === focusVerseKey);
    if (focus !== undefined && focus.verseNumber !== 1) {
      return;
    }
    run.measureLayout(rootRef.current, (_x, y) => onFocusOffset(page, y));
  };
  // Each paragraph's lines are measured inside this page's root. A mid-page focus ayah then starts at its own line,
  // so going to an ayah puts its line at the top of the screen (ADR 0073).
  const onRunLines = (run: SurahRun, text: HostInstance, lines: readonly TextLine[]) => {
    if (rootRef.current === null) {
      return;
    }
    measureWithin(text, rootRef.current, (top) => {
      if (top === null) {
        return;
      }
      onRunMeasured?.(page, { lines, run, textTop: top });
      const focus = run.find((verse) => verse.verseKey === focusVerseKey);
      if (focus === undefined || focus.verseNumber === 1 || onFocusOffset === undefined) {
        return;
      }
      const range = paragraphVerseRanges(run).find((item) => item.verseKey === focus.verseKey);
      if (range === undefined) {
        return;
      }
      const index = lineForOffset(lines, range.start);
      onFocusOffset(page, top + (lines[index]?.y ?? 0));
    });
  };

  return (
    <View
      ref={(node) => {
        rootRef.current = node;
        onRootNode?.(node);
      }}
    >
      {page > 1 ? (
        <PageDivider
          label={t('reader.toolbar.place', { juz: formatNumber(juz, locale), page: formatNumber(page, locale) })}
          testID={testID ? `${testID}-break-${page}` : undefined}
        />
      ) : null}
      <HafsMushafPage
        chapters={chapters}
        focusVerseKey={focusVerseKey}
        follow={follow}
        followKey={followKey}
        fontScale={fontScale}
        highlightsByVerseId={highlightsByVerseId}
        khatmaMarkerVerseId={khatmaMarkerVerseId}
        onFocusRunLayout={measureFocus}
        onOpenActions={onOpenAyahActions}
        onPressVerse={onSelectVerseKey}
        onRunLines={onRunLines}
        placeVerseKey={placeVerseKey}
        recitedVerseKey={recitedVerseKey}
        recitedWord={recitedWord}
        testID={testID ? `${testID}-page-${page}` : undefined}
        verses={verses}
      />
    </View>
  );
}
