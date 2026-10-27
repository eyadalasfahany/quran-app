import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View, type HostInstance } from 'react-native';

import { formatNumber, type Locale } from '@/core/i18n';
import type { SqlExecutor } from '@/core/db/sql-executor';
import { PageDivider } from '@/shared/ui';

import type { ChapterRecord } from '../data/chapters';
import { getVersesByPage } from '../data/verses';
import { HafsMushafPage } from './HafsMushafPage';

// One page of the Tanzil (Hafs) Mushaf in the list, led by the break from the page before it.
export function HafsPage({
  page,
  executor,
  chapters,
  fontScale,
  selectedVerseKey,
  onSelectVerseKey,
  onOpenAyahActions,
  focusVerseKey = null,
  onFocusOffset,
  testID,
}: {
  page: number;
  executor: SqlExecutor;
  chapters: ReadonlyMap<number, ChapterRecord>;
  fontScale: number;
  selectedVerseKey: string | null;
  onSelectVerseKey?: (verseKey: string) => void;
  onOpenAyahActions?: (verseKey: string) => void;
  /** The ayah the reader opened at, when it is on this page. */
  focusVerseKey?: string | null;
  /** How far below the top of this page the surah paragraph holding that ayah starts. */
  onFocusOffset?: (page: number, offset: number) => void;
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
    <View ref={rootRef}>
      {page > 1 ? (
        <PageDivider
          label={t('reader.toolbar.place', { juz: formatNumber(juz, locale), page: formatNumber(page, locale) })}
          testID={testID ? `${testID}-break-${page}` : undefined}
        />
      ) : null}
      <HafsMushafPage
        chapters={chapters}
        focusVerseKey={focusVerseKey}
        fontScale={fontScale}
        onFocusRunLayout={measureFocus}
        onOpenActions={onOpenAyahActions}
        onPressVerse={onSelectVerseKey}
        selectedVerseKey={selectedVerseKey}
        testID={testID ? `${testID}-page-${page}` : undefined}
        verses={verses}
      />
    </View>
  );
}
