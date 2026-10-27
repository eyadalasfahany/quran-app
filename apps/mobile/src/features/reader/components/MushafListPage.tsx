import { useMemo } from 'react';
import { View } from 'react-native';

import type { SqlExecutor } from '@/core/db/sql-executor';
import type { HighlightColor } from '@/features/library/data/model';
import { firstVerseOfPage } from '@/features/reader/anchor/page';
import type { ChapterRecord } from '@/features/reader/data/chapters';
import { getMushafPage, isPageInstalled, type MushafLine } from '@/features/reader/data/mushaf';
import { QCF_V2_MUSHAF_ID } from '@/features/reader/mushaf/constants';
import { mushafPageHeight } from '@/features/reader/mushaf/page-metrics';
import { useMushafPageFont } from '@/features/reader/mushaf/useMushafPageFont';

import { MushafPage } from './MushafPage';
import { MushafPagePlaceholder } from './MushafPagePlaceholder';

// One page-exact QCF page in the list: the page itself, a placeholder when its layout or font is
// missing, or an empty slot of the page's height while the font loads.
export function MushafListPage({
  page,
  contentWidth,
  framePadding,
  executor,
  chapterStarts,
  selectedVerseId,
  activeVerseId,
  highlightsByVerseId,
  onSelectVerseId,
  onOpenAyahActions,
  onSwitchToReading,
  testID,
}: {
  page: number;
  contentWidth: number;
  framePadding: number;
  executor: SqlExecutor;
  chapterStarts: readonly ChapterRecord[];
  selectedVerseId: number | null;
  activeVerseId: number | null;
  highlightsByVerseId: ReadonlyMap<number, HighlightColor>;
  onSelectVerseId?: (verseId: number) => void;
  onOpenAyahActions?: (verseId: number) => void;
  onSwitchToReading?: (verseKey: string) => void;
  testID?: string;
}) {
  const font = useMushafPageFont(page);
  const layoutInstalled = isPageInstalled(executor, QCF_V2_MUSHAF_ID, page);
  const lines = useMemo(
    () => (layoutInstalled ? getMushafPage(executor, QCF_V2_MUSHAF_ID, page) : []),
    [executor, layoutInstalled, page],
  );
  const chapterForVerse = useMemo(() => verseChapterLookup(executor, lines), [executor, lines]);
  const verseKey = firstVerseOfPage(executor, page) ?? '1:1';
  const minHeight = mushafPageHeight(contentWidth, framePadding);

  if (!layoutInstalled) {
    return (
      <View style={{ minHeight }}>
        <MushafPagePlaceholder
          onSwitchToReading={onSwitchToReading ? () => onSwitchToReading(verseKey) : undefined}
          testID={testID ? `${testID}-placeholder` : undefined}
          variant="missing-layout"
        />
      </View>
    );
  }

  if (font.status === 'error') {
    return (
      <View style={{ minHeight }}>
        <MushafPagePlaceholder
          onSwitchToReading={onSwitchToReading ? () => onSwitchToReading(verseKey) : undefined}
          testID={testID ? `${testID}-placeholder` : undefined}
        />
      </View>
    );
  }

  if (font.status === 'loading') {
    return <View style={{ minHeight }} testID={testID ? `${testID}-loading` : undefined} />;
  }

  return (
    <View style={{ alignItems: 'center', minHeight, paddingVertical: framePadding }}>
      <MushafPage
        activeVerseId={activeVerseId}
        chapterForVerse={chapterForVerse}
        chapterStarts={chapterStarts}
        contentWidth={contentWidth}
        fontFamily={font.fontFamily}
        highlightByVerse={highlightsByVerseId}
        lines={lines}
        onVerseLongPress={onOpenAyahActions}
        onVersePress={onSelectVerseId}
        selectedVerseId={selectedVerseId}
        testID={testID}
      />
    </View>
  );
}

function verseChapterLookup(executor: SqlExecutor, lines: readonly MushafLine[]): (verseId: number) => number | undefined {
  const cache = new Map<number, number>();
  for (const line of lines) {
    for (const word of line.words) {
      if (cache.has(word.verseId)) {
        continue;
      }
      const row = executor.get<{ chapterId: number }>('SELECT chapter_id AS chapterId FROM verses WHERE id = ?', [word.verseId]);
      if (row !== undefined) {
        cache.set(word.verseId, row.chapterId);
      }
    }
  }
  return (verseId: number) => cache.get(verseId);
}
