import { FlashList, type FlashListRef, type ListRenderItemInfo } from '@shopify/flash-list';
import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';

import { openContentDb } from '@/core/db/content/open';
import { useTheme } from '@/core/theme';
import { firstVerseOfPage, pageForVerse } from '@/features/reader/anchor/page';

import { HafsPage } from './components/HafsPage';
import { listChapters } from './data/chapters';

export type HafsMushafListProps = {
  anchorVerseKey: string;
  fontScale?: number;
  topInset?: number;
  bottomInset?: number;
  selectedVerseKey?: string | null;
  onVisiblePage?: (page: number, verseKey: string) => void;
  onSelectVerseKey?: (verseKey: string) => void;
  onOpenAyahActions?: (verseKey: string) => void;
  testID?: string;
};

const PAGE_NUMBERS = Array.from({ length: 604 }, (_, index) => index + 1);

export function HafsMushafList({
  anchorVerseKey,
  fontScale = 1,
  topInset = 0,
  bottomInset = 0,
  selectedVerseKey = null,
  onVisiblePage,
  onSelectVerseKey,
  onOpenAyahActions,
  testID,
}: HafsMushafListProps) {
  const theme = useTheme();
  const listRef = useRef<FlashListRef<number>>(null);
  const { executor } = useMemo(() => openContentDb(), []);
  const chapters = useMemo(() => new Map(listChapters(executor).map((chapter) => [chapter.id, chapter])), [executor]);
  const initialPage = pageForVerse(executor, anchorVerseKey) ?? 1;
  const visiblePageRef = useRef(initialPage);

  useLayoutEffect(() => {
    const page = pageForVerse(executor, anchorVerseKey);
    if (page === undefined || page === visiblePageRef.current) {
      return;
    }
    visiblePageRef.current = page;
    listRef.current?.scrollToIndex({ animated: false, index: page - 1 });
  }, [anchorVerseKey, executor]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: { isViewable: boolean; item: number; index: number | null }[] }) => {
      const viewable = viewableItems.filter(
        (token): token is { isViewable: boolean; item: number; index: number } =>
          token.isViewable && token.index !== null,
      );
      if (viewable.length === 0) {
        return;
      }
      const primary = viewable.reduce((best, token) => (token.index < best.index ? token : best));
      visiblePageRef.current = primary.item;
      const verseKey = firstVerseOfPage(executor, primary.item);
      if (verseKey !== undefined) {
        onVisiblePage?.(primary.item, verseKey);
      }
    },
    [executor, onVisiblePage],
  );

  const renderPage = useCallback(
    ({ item: page }: ListRenderItemInfo<number>) => (
      <HafsPage
        chapters={chapters}
        executor={executor}
        fontScale={fontScale}
        onOpenAyahActions={onOpenAyahActions}
        onSelectVerseKey={onSelectVerseKey}
        page={page}
        selectedVerseKey={selectedVerseKey}
        testID={testID}
      />
    ),
    [chapters, executor, fontScale, onOpenAyahActions, onSelectVerseKey, selectedVerseKey, testID],
  );

  return (
    <View style={{ flex: 1, paddingBottom: bottomInset, paddingTop: topInset }} testID={testID}>
      <FlashList
        contentContainerStyle={{ paddingHorizontal: theme.space[4] }}
        data={PAGE_NUMBERS}
        initialScrollIndex={Math.max(0, initialPage - 1)}
        keyExtractor={(page) => String(page)}
        onViewableItemsChanged={onViewableItemsChanged}
        ref={listRef}
        renderItem={renderPage}
        viewabilityConfig={{ itemVisiblePercentThreshold: 20 }}
      />
    </View>
  );
}
