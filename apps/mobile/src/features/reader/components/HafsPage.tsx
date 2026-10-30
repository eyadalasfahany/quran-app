import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View, type HostInstance } from 'react-native';

import { formatNumber, type Locale } from '@/core/i18n';
import type { SqlExecutor } from '@/core/db/sql-executor';
import { PageDivider, type HighlightColor } from '@/shared/ui';

import type { ChapterRecord } from '../data/chapters';
import { getVersesByPage } from '../data/verses';
import type { WordFollow } from '../useWordFollow';
import { HafsMushafPage } from './HafsMushafPage';

// One page of the Tanzil (Hafs) Mushaf in the list, led by the break from the page before it.
export function HafsPage({
  page,
  executor,
  chapters,
  fontScale,
  selectedVerseKey,
  recitedVerseKey = null,
  recitedWord = null,
  highlightsByVerseId,
  onSelectVerseKey,
  onOpenAyahActions,
  focusVerseKey = null,
  onFocusOffset,
  follow,
  followKey = null,
  onRootNode,
  testID,
}: {
  page: number;
  executor: SqlExecutor;
  chapters: ReadonlyMap<number, ChapterRecord>;
  fontScale: number;
  selectedVerseKey: string | null;
  /** The ayah the player is reciting. */
  recitedVerseKey?: string | null;
  recitedWord?: number | null;
  highlightsByVerseId?: ReadonlyMap<number, HighlightColor>;
  onSelectVerseKey?: (verseKey: string) => void;
  onOpenAyahActions?: (verseKey: string) => void;
  /** The ayah the reader opened at, when it is on this page. */
  focusVerseKey?: string | null;
  /** How far below the top of this page the surah paragraph holding that ayah starts. */
  onFocusOffset?: (page: number, offset: number) => void;
  /** The word follow-scroll, and the followed ayah: its paragraph's Text reports its lines to the follow. */
  follow?: WordFollow;
  followKey?: string | null;
  /** The page's root node, which the follow measures the followed paragraph against. */
  onRootNode?: (node: HostInstance | null) => void;
  testID?: string;
}) {
  const rootRef = useRef<HostInstance>(null);
  const measureFocus = (run: HostInstance | null) => {
    if (run === null || rootRef.current === null || onFocusOffset === undefined) {
      return;
    }
    run.measureLayout(rootRef.current, (_x, y) => onFocusOffset(page, y));
  };
  const { t, i18n } = useTranslation();
  const locale: Locale = i18n.language === 'en' ? 'en' : 'ar';
  const verses = useMemo(() => getVersesByPage(executor, page), [executor, page]);
  const juz = verses[0]?.juz ?? 1;

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
        onFocusRunLayout={measureFocus}
        onOpenActions={onOpenAyahActions}
        onPressVerse={onSelectVerseKey}
        recitedVerseKey={recitedVerseKey}
        recitedWord={recitedWord}
        selectedVerseKey={selectedVerseKey}
        testID={testID ? `${testID}-page-${page}` : undefined}
        verses={verses}
      />
    </View>
  );
}
