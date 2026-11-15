import { FlashList, type FlashListRef, type ListRenderItemInfo } from '@shopify/flash-list';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWindowDimensions, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { openContentDb } from '@/core/db/content/open';
import { formatNumber, type Locale } from '@/core/i18n';
import type { SvgMushafKey, SvgMushafPackReader } from '@/core/mushaf-pack';
import { useTheme } from '@/core/theme';
import { PageDivider, useContrastColors, type HighlightColor } from '@/shared/ui';

import { MushafPageError } from './components/MushafPageError';
import { MushafScrollView } from './components/MushafScrollView';
import { MushafSvgPage } from './components/MushafSvgPage';
import { getVerseByKey, idToVerseKey } from './data/verses';
import { offsetForAyah, topAyahAt } from './mushaf-svg/ayah-anchor';
import { ayahLabelFor } from './mushaf-svg/ayah-label';
import { MUSHAF_FRAME_SIDE, pageHeightFor, pageItemHeight, pageWidthFor, scaleFor } from './mushaf-svg/page-layout';
import type { PageRegionGeometry } from './mushaf-svg/region-geometry';
import { useBoxFollow } from './mushaf-svg/useBoxFollow';
import { useMushafPageLoader } from './mushaf-svg/useMushafPageLoader';
import { extendPageWindow, MUSHAF_PAGE_COUNT, pageWindowFrom, pagesIn, type PageWindow } from './page-window';

/** The divider's height before FlashList measures it. */
const DIVIDER_ESTIMATE = 48;
/** How long after a programmatic scroll the top-ayah report still ignores the scroll. */
const PROGRAMMATIC_MS = 450;
const NO_MARKS: ReadonlyMap<string, HighlightColor> = new Map();

export type MushafSvgListProps = {
  mushafKey: SvgMushafKey;
  /** The installed pack, given by the container (never null here). */
  reader: SvgMushafPackReader;
  anchorVerseKey: string;
  topInset?: number;
  bottomInset?: number;
  contentBottomInset?: number;
  recitedVerseKey?: string | null;
  recitedWord?: number | null;
  followKey?: string | null;
  highlightsByVerseId?: ReadonlyMap<number, HighlightColor>;
  khatmaMarkerVerseId?: number | null;
  placeVerseKey?: string | null;
  onVisiblePage?: (page: number, verseKey: string) => void;
  onTopAyah?: (page: number, verseKey: string) => void;
  onSelectVerseKey?: (verseKey: string) => void;
  onOpenAyahActions?: (verseKey: string) => void;
  onUserScrollStart?: () => void;
  testID?: string;
};

function parseVerseKey(verseKey: string): { surah: number; ayah: number } | null {
  const [surah, ayah] = verseKey.split(':').map(Number);
  return surah !== undefined && ayah !== undefined && Number.isInteger(surah) && Number.isInteger(ayah)
    ? { ayah, surah }
    : null;
}

/**
 * The Madinah mushaf as a vertical list of framed pages (ADR 0090). Every verse→page lookup uses the pack's regions
 * (W6), never `verses.page`. A page's size is known from the width, so the anchor scroll needs no measuring.
 */
export function MushafSvgList({
  mushafKey,
  reader,
  anchorVerseKey,
  topInset = 0,
  bottomInset = 0,
  contentBottomInset = 0,
  recitedVerseKey = null,
  recitedWord = null,
  followKey = null,
  highlightsByVerseId,
  khatmaMarkerVerseId = null,
  placeVerseKey = null,
  onVisiblePage,
  onTopAyah,
  onSelectVerseKey,
  onOpenAyahActions,
  onUserScrollStart,
  testID,
}: MushafSvgListProps) {
  const { t, i18n } = useTranslation();
  const locale: Locale = i18n.language === 'en' ? 'en' : 'ar';
  const theme = useTheme();
  const colors = useContrastColors();
  const reduceMotion = useReducedMotion();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const listRef = useRef<FlashListRef<number>>(null);
  const executor = useMemo(() => openContentDb().executor, []);
  const loader = useMushafPageLoader(reader, mushafKey);
  const pageWidth = pageWidthFor(windowWidth, 2 * theme.space[4] + 2 * MUSHAF_FRAME_SIDE);
  const scale = scaleFor(pageWidth);
  const isHafs = mushafKey === 'hafs';

  // The page the anchor ayah starts on, from the pack (W6). Without it, the list opens on page 1.
  const anchorPage = useMemo(() => {
    const parts = parseVerseKey(anchorVerseKey);
    return (parts === null ? null : reader.pageForAyah(parts.surah, parts.ayah)) ?? 1;
  }, [anchorVerseKey, reader]);
  const followPage = useMemo(() => {
    const parts = followKey === null ? null : parseVerseKey(followKey);
    return parts === null ? null : (reader.pageForAyah(parts.surah, parts.ayah) ?? null);
  }, [followKey, reader]);

  const [pageWindow, setPageWindow] = useState<PageWindow>(() => pageWindowFrom(anchorPage));
  const pages = useMemo(() => pagesIn(pageWindow), [pageWindow]);

  // Settling: the anchor scroll has not landed. The start-of-list extension and the top-ayah report wait for it.
  const settling = useRef(true);
  const visiblePage = useRef(anchorPage);
  // The anchor scroll to run once the window holds its page (on mount, and after an anchor jump to another page).
  const pendingScroll = useRef<{ page: number; verseKey: string; animated: boolean } | null>({
    animated: false,
    page: anchorPage,
    verseKey: anchorVerseKey,
  });
  const programmatic = useRef(false);
  const programmaticTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markProgrammatic = useCallback(() => {
    programmatic.current = true;
    if (programmaticTimer.current !== null) {
      clearTimeout(programmaticTimer.current);
    }
    programmaticTimer.current = setTimeout(() => {
      programmatic.current = false;
      programmaticTimer.current = null;
    }, PROGRAMMATIC_MS);
  }, []);

  useEffect(
    () => () => {
      if (programmaticTimer.current !== null) {
        clearTimeout(programmaticTimer.current);
      }
    },
    [],
  );

  // A verse on another page rebuilds the window there and scrolls to it (animated only while following).
  useLayoutEffect(() => {
    if (anchorPage === visiblePage.current) {
      return;
    }
    visiblePage.current = anchorPage;
    settling.current = true;
    pendingScroll.current = { animated: followKey !== null && !reduceMotion, page: anchorPage, verseKey: anchorVerseKey };
    setPageWindow(pageWindowFrom(anchorPage));
  }, [anchorPage, anchorVerseKey, followKey, reduceMotion]);

  // A size change (rotation, a split view) re-anchors the reader on the same ayah, with no animation.
  const widthRef = useRef(pageWidth);
  useLayoutEffect(() => {
    if (widthRef.current === pageWidth) {
      return;
    }
    widthRef.current = pageWidth;
    visiblePage.current = anchorPage;
    settling.current = true;
    pendingScroll.current = { animated: false, page: anchorPage, verseKey: anchorVerseKey };
    setPageWindow(pageWindowFrom(anchorPage));
  }, [anchorPage, anchorVerseKey, pageWidth]);

  // The artwork's top inside a page's item: the divider above it (when there is one) and the frame's top side.
  const artworkTopIn = useCallback(
    (index: number, page: number) => {
      const itemHeight =
        listRef.current?.getLayout(index)?.height ?? pageItemHeight(pageWidth, page > 1 ? DIVIDER_ESTIMATE : 0);
      return itemHeight - pageHeightFor(pageWidth) - MUSHAF_FRAME_SIDE;
    },
    [pageWidth],
  );

  useEffect(() => {
    const pending = pendingScroll.current;
    if (pending === null) {
      return;
    }
    pendingScroll.current = null;
    const index = pages.indexOf(pending.page);
    requestAnimationFrame(() => {
      const list = listRef.current;
      if (list === null || index < 0) {
        settling.current = false;
        return;
      }
      const parts = parseVerseKey(pending.verseKey);
      // A surah's first ayah keeps the page top: its title is the page's first line.
      const line =
        parts === null || parts.ayah === 1 ? 0 : (offsetForAyah(loader.regions(pending.page), pending.verseKey, pageWidth) ?? 0);
      markProgrammatic();
      void Promise.resolve(
        list.scrollToIndex({ animated: pending.animated, index, viewOffset: artworkTopIn(index, pending.page) + line }),
      ).then(() =>
        requestAnimationFrame(() => {
          settling.current = false;
        }),
      );
    });
    // The scroll is set by the page window; the helpers it reads are stable for one width.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, pageWidth]);

  // The recited word's box, or the ayah's first line, is the line the follow keeps in view (ADR 0023, 0037).
  const followRegions = useMemo(() => (followPage === null ? [] : loader.regions(followPage)), [followPage, loader]);
  const followLine = useMemo<{ y0: number; y1: number } | null>(() => {
    if (followPage === null || recitedVerseKey === null) {
      return null;
    }
    const box =
      recitedWord === null
        ? undefined
        : loader.wordBoxes(followPage).find((item) => `${item.surah}:${item.ayah}` === recitedVerseKey && item.position === recitedWord);
    if (box !== undefined) {
      return { y0: box.y0, y1: box.y1 };
    }
    const first = followRegions.find((region) => region.verseKey === recitedVerseKey)?.lines[0];
    return first === undefined ? null : { y0: first.y0, y1: first.y1 };
  }, [followPage, followRegions, loader, recitedVerseKey, recitedWord]);
  const followIndex = followPage === null ? -1 : pages.indexOf(followPage);

  const follow = useBoxFollow({
    bottomInset: contentBottomInset,
    currentOffset: () =>
      typeof listRef.current?.getAbsoluteLastScrollOffset === 'function' ? listRef.current.getAbsoluteLastScrollOffset() : 0,
    fallbackHeight: Math.max(0, windowHeight - topInset - bottomInset),
    following: followKey !== null && followLine !== null,
    line: followLine,
    lineKey: followLine === null ? null : `${recitedVerseKey}:${recitedWord}:${followPage}`,
    pageTop: () => {
      const list = listRef.current;
      const layout = list === null || followIndex < 0 ? undefined : list.getLayout(followIndex);
      if (list === null || layout === undefined) {
        return null;
      }
      return layout.y + list.getFirstItemOffset() + artworkTopIn(followIndex, followPage ?? 1) - list.getAbsoluteLastScrollOffset();
    },
    reduceMotion,
    scale,
    scrollTo: (offset, animated) => {
      markProgrammatic();
      listRef.current?.scrollToOffset({ animated, offset });
    },
  });

  // Marks are keyed by verse key for Hafs only: other riwayat have their own ayah numbers, so none lands on them.
  const highlightByVerseKey = useMemo(() => {
    if (!isHafs || highlightsByVerseId === undefined) {
      return NO_MARKS;
    }
    const marks = new Map<string, HighlightColor>();
    for (const [verseId, colour] of highlightsByVerseId) {
      const key = idToVerseKey(executor, verseId);
      if (key !== undefined) {
        marks.set(key, colour);
      }
    }
    return marks;
  }, [executor, highlightsByVerseId, isHafs]);
  const khatmaKey = isHafs && khatmaMarkerVerseId !== null ? (idToVerseKey(executor, khatmaMarkerVerseId) ?? null) : null;
  const placeKey = isHafs ? placeVerseKey : null;

  // A theme change drops the pictures of the old ink (the paths stay); the rows then record the new ones.
  const [ink, setInk] = useState(colors.ink);
  if (ink !== colors.ink) {
    setInk(colors.ink);
    loader.clearPictures();
  }

  // The pages around the viewable ones are loaded in idle slots, nearest first.
  const prefetchAround = useCallback(
    (page: number) => loader.prefetch([page, page + 1, page - 1, page + 2].filter((item) => item >= 1 && item <= MUSHAF_PAGE_COUNT)),
    [loader],
  );
  useEffect(() => {
    prefetchAround(anchorPage);
  }, [anchorPage, prefetchAround]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: { isViewable: boolean; item: number; index: number | null }[] }) => {
      const visible = viewableItems.filter(
        (token): token is { isViewable: boolean; item: number; index: number } => token.isViewable && token.index !== null,
      );
      if (visible.length === 0) {
        return;
      }
      const primary = visible.reduce((best, token) => (token.index < best.index ? token : best));
      prefetchAround(primary.item);
      if (settling.current) {
        return;
      }
      const first = reader.firstAyahOnPage(primary.item);
      if (first !== null) {
        visiblePage.current = primary.item;
        onVisiblePage?.(primary.item, `${first.surah}:${first.ayah}`);
      }
    },
    [onVisiblePage, prefetchAround, reader],
  );

  // After a hand scroll ends (ADR 0073): the page under the viewport top, then the first line on it at or below the top.
  const reportTopAyah = useCallback(() => {
    const list = listRef.current;
    if (settling.current || programmatic.current || list === null) {
      return;
    }
    const scrollOffset = list.getAbsoluteLastScrollOffset();
    const firstItem = list.getFirstItemOffset();
    let under: { page: number; artworkTop: number } | null = null;
    for (let index = 0; index < pages.length; index += 1) {
      const layout = list.getLayout(index);
      const page = pages[index]!;
      if (layout !== undefined && layout.y + firstItem <= scrollOffset) {
        under = { artworkTop: layout.y + firstItem + artworkTopIn(index, page), page };
      }
    }
    if (under === null) {
      return;
    }
    const picked = under as { page: number; artworkTop: number };
    const yInPage = (scrollOffset - picked.artworkTop) / scale;
    const first = reader.firstAyahOnPage(picked.page);
    const verseKey =
      topAyahAt(loader.regions(picked.page), yInPage) ?? (first === null ? null : `${first.surah}:${first.ayah}`);
    const parts = verseKey === null ? null : parseVerseKey(verseKey);
    if (verseKey === null || parts === null) {
      return;
    }
    const page = reader.pageForAyah(parts.surah, parts.ayah) ?? picked.page;
    visiblePage.current = page;
    onTopAyah?.(page, verseKey);
  }, [artworkTopIn, loader, onTopAyah, pages, reader, scale]);

  // Rows repaint when the page data, the marks, the recited word or the ink change (FlashList's extraData).
  const extraData = useMemo(
    () => ({ colors: colors.ink, highlightByVerseKey, khatmaKey, placeKey, recitedVerseKey, recitedWord, version: loader.version }),
    [colors.ink, highlightByVerseKey, khatmaKey, loader.version, placeKey, recitedVerseKey, recitedWord],
  );

  const renderPage = useCallback(
    ({ item: page }: ListRenderItemInfo<number>) => {
      const first = reader.firstAyahOnPage(page);
      const juz = (first === null ? undefined : getVerseByKey(executor, `${first.surah}:${first.ayah}`))?.juz ?? 1;
      return (
        <View>
          {page > 1 ? (
            <PageDivider
              label={t('reader.toolbar.place', { juz: formatNumber(juz, locale), page: formatNumber(page, locale) })}
              testID={testID ? `${testID}-break-${page}` : undefined}
            />
          ) : null}
          <View testID={testID ? `${testID}-frame-${page}` : undefined}>
            {loader.error(page) ? (
              <MushafPageError
                height={pageHeightFor(pageWidth)}
                onRetry={() => loader.retry(page)}
                testID={testID ? `${testID}-error-${page}` : undefined}
                width={pageWidth}
              />
            ) : (
              <MushafSvgPage
                ayahLabel={(region: PageRegionGeometry) => ayahLabelFor({ executor, locale, mushafKey, region, t })}
                highlightByVerseKey={highlightByVerseKey}
                khatmaMarkerVerseKey={khatmaKey}
                model={loader.model(page)}
                onOpenAyahActions={onOpenAyahActions}
                onSelectVerseKey={onSelectVerseKey}
                page={page}
                pictureOf={(colour) => loader.pictureOf(page, colour)}
                placeVerseKey={placeKey}
                recitedVerseKey={recitedVerseKey}
                recitedWord={recitedWord}
                regions={loader.regions(page)}
                testID={testID ? `${testID}-page-${page}` : undefined}
                width={pageWidth}
                wordBoxes={loader.wordBoxes(page)}
              />
            )}
          </View>
        </View>
      );
    },
    [executor, highlightByVerseKey, khatmaKey, loader, locale, mushafKey, onOpenAyahActions, onSelectVerseKey, pageWidth, placeKey, reader, recitedVerseKey, recitedWord, t, testID],
  );

  return (
    <View style={{ flex: 1, paddingBottom: bottomInset, paddingTop: topInset }} testID={testID}>
      <View {...follow.viewportProps} style={{ flex: 1 }}>
        <FlashList
          contentContainerStyle={{ paddingBottom: contentBottomInset, paddingHorizontal: theme.space[4] }}
          data={pages}
          extraData={extraData}
          keyExtractor={(page) => String(page)}
          maintainVisibleContentPosition={{}}
          onEndReached={() => setPageWindow((current) => extendPageWindow(current, 'end'))}
          onEndReachedThreshold={0.6}
          onMomentumScrollEnd={reportTopAyah}
          onScrollBeginDrag={() => {
            programmatic.current = false;
            onUserScrollStart?.();
          }}
          onScrollEndDrag={reportTopAyah}
          onStartReached={() => {
            if (!settling.current) {
              setPageWindow((current) => extendPageWindow(current, 'start'));
            }
          }}
          onStartReachedThreshold={0.6}
          onViewableItemsChanged={onViewableItemsChanged}
          ref={listRef}
          renderItem={renderPage}
          renderScrollComponent={MushafScrollView}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          viewabilityConfig={{ itemVisiblePercentThreshold: 20 }}
        />
      </View>
    </View>
  );
}
