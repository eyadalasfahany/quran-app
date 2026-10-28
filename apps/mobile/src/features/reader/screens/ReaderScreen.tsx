import { type Href, router, useSegments } from 'expo-router';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, useWindowDimensions } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { openContentDb } from '@/core/db/content/open';
import type { SqlExecutor } from '@/core/db/sql-executor';
import { formatNumber, type Locale } from '@/core/i18n';
import { useWindowClass } from '@/core/layout';
import { listBookmarks, toggleBookmark } from '@/features/library/data';
import { Screen } from '@/shared/ui';

import { resolveInitialAnchor, writeReadingAnchor } from '../anchor/reading-anchor';
import { pageForVerse } from '../anchor/page';
import { useReadingAnchor } from '../anchor/useReadingAnchor';
import { AdaptiveReaderLayout } from '../components/AdaptiveReaderLayout';
import { FocusReader } from '../components/FocusReader';
import { ReaderModeFade } from '../components/ReaderModeFade';
import { READER_TOOLBAR_CLEARANCE, ReaderToolbar } from '../components/ReaderToolbar';
import { ResumePill } from '../components/ResumePill';
import { SidePanel } from '../components/SidePanel';
import { getChapter } from '../data/chapters';
import { getVerseByKey } from '../data/verses';
import { HafsMushafList } from '../HafsMushafList';
import { panelPlacementFor, panelStripWidth } from '../layout';
import { AyahPanelContent } from '../panels/AyahPanelContent';
import { ReadingList } from '../ReadingList';
import { useReaderSelection } from '../selection';
import { useReaderSettings } from '../settings';

type ReaderChrome = {
  title: string;
  page: number | null;
  juz: number | null;
  verseId: number | null;
};

function isAyahSheet(segment: string | undefined): boolean {
  return segment === 'ayah' || segment === 'tafsir';
}

function loadChrome(executor: SqlExecutor, verseKey: string, locale: Locale): ReaderChrome {
  const verse = getVerseByKey(executor, verseKey);
  if (verse === undefined) {
    return { juz: null, page: null, title: verseKey, verseId: null };
  }
  const chapter = getChapter(executor, verse.chapterId);
  const title = chapter === undefined ? verseKey : locale === 'ar' ? chapter.nameArabic : chapter.nameEn;
  return { juz: verse.juz, page: verse.page, title, verseId: verse.id };
}

export function ReaderScreen({ verseKey }: { verseKey: string }) {
  const { t, i18n } = useTranslation();
  const insets = useContext(SafeAreaInsetsContext) ?? { bottom: 0, left: 0, right: 0, top: 0 };
  const segments = useSegments();
  const width = useWindowDimensions().width;
  const windowClass = useWindowClass();
  const locale: Locale = i18n.language === 'en' ? 'en' : 'ar';
  const seeded = useRef<boolean | null>(null);
  if (seeded.current == null) {
    writeReadingAnchor(resolveInitialAnchor({ verseKey }));
    seeded.current = true;
  }
  const anchor = useReadingAnchor();
  const mode = useReaderSettings((state) => state.mode);
  const fontScale = useReaderSettings((state) => state.fontScale);
  const selection = useReaderSelection();
  const [visibleVerseKey, setVisibleVerseKey] = useState<string | null>(null);
  const [pinnedVerseKey, setPinnedVerseKey] = useState<string | null>(null);
  const [bookmarkOverride, setBookmarkOverride] = useState<{ verseId: number; value: boolean } | null>(null);
  // A pin (Focus's current ayah, or the resume pill's target) belongs to the mode that set it. Another
  // mode opens at the saved place, which already holds that ayah.
  const [pinMode, setPinMode] = useState(mode);
  if (pinMode !== mode) {
    setPinMode(mode);
    setPinnedVerseKey(null);
  }

  const executor = useMemo(() => {
    try {
      return openContentDb().executor;
    } catch {
      return null;
    }
  }, []);

  const placement = panelPlacementFor(width, windowClass);
  const listAnchor = pinnedVerseKey ?? anchor.verseKey;
  // The toolbar names the saved place, which follows the scroll even while the list is pinned.
  const chrome = useMemo(
    () =>
      executor === null
        ? { juz: null, page: null, title: anchor.verseKey, verseId: null }
        : loadChrome(executor, anchor.verseKey, locale),
    [executor, anchor.verseKey, locale],
  );
  const subtitle =
    chrome.page === null || chrome.juz === null
      ? undefined
      : t('reader.toolbar.place', { juz: formatNumber(chrome.juz, locale), page: formatNumber(chrome.page, locale) });

  useEffect(() => {
    if (anchor.mode !== mode) {
      anchor.setMode(mode);
    }
  }, [anchor, mode]);

  useEffect(() => {
    if (executor === null || mode !== 'mushaf' || anchor.page !== null) {
      return;
    }
    const page = pageForVerse(executor, anchor.verseKey);
    if (page !== undefined) {
      anchor.setVisible({ page, verseKey: anchor.verseKey });
    }
  }, [anchor, executor, mode]);

  const storedBookmarked = useMemo(() => {
    if (chrome.verseId === null) {
      return false;
    }
    try {
      return listBookmarks().some((bookmark) => bookmark.verseId === chrome.verseId);
    } catch {
      return false;
    }
  }, [chrome.verseId]);
  const bookmarked =
    bookmarkOverride !== null && bookmarkOverride.verseId === chrome.verseId
      ? bookmarkOverride.value
      : storedBookmarked;

  // Opened by a deep link or restored at launch, the reader has nothing under it to go back to.
  const leaveReader = () => {
    // TEMP-DEBUG-BACK: remove after the Back bug is found.
    void fetch('http://localhost:9799/back-pressed').catch(() => undefined);
    void fetch(`http://localhost:9799/back?can=${router.canGoBack()}&seg=${encodeURIComponent(JSON.stringify(segments))}`).catch(
      () => undefined,
    );
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(main)/(home)' as Href);
  };

  const selectVerse = (key: string) => {
    useReaderSelection.getState().selectVerse(key, placement);
    if (placement === 'sheet') {
      router.push(`/ayah/${key}` as Href);
    }
  };

  // Same calls as the ayah sheet's tafsir tile: the tab is set first, because the tafsir route reads it on mount.
  const openTafsir = (key: string) => {
    useReaderSelection.getState().selectVerse(key, placement);
    useReaderSelection.getState().setPanelTab('tafsir');
    if (placement === 'sheet') {
      router.push(`/tafsir/${key}` as Href);
    }
  };

  // A sheet covers the reader without changing it: the toolbar stays, the page keeps its inset and scroll,
  // and the resume pill doesn't appear for the ayah the sheet was opened on.
  const sheetOpen = segments.some((segment) => segment === 'reader-settings' || segment === 'ayah' || segment === 'tafsir');
  // Focus pages one ayah at a time with its own transport, so the resume pill has nothing to return to.
  const focus = mode === 'focus';
  const showResume =
    !focus &&
    !sheetOpen &&
    selection.verseKey !== null &&
    visibleVerseKey !== null &&
    visibleVerseKey !== selection.verseKey &&
    pinnedVerseKey !== selection.verseKey;

  const gutter = placement === 'docked' ? panelStripWidth() : 0;
  const topInset = insets.top + READER_TOOLBAR_CLEARANCE;

  return (
    <Screen accessibilityLabel={anchor.verseKey} surface="surfacePage" testID="reader-screen" topInset={false}>
      <AdaptiveReaderLayout
        bottomInset={insets.bottom}
        onCloseOverlay={() => useReaderSelection.getState().closePanel()}
        onMoveToPanel={() => {
          useReaderSelection.getState().setPanelOpen(true);
          if (isAyahSheet(segments[0])) {
            router.back();
          }
        }}
        onMoveToSheet={(key) => {
          useReaderSelection.getState().setPanelOpen(false);
          router.push(`/ayah/${key}` as Href);
        }}
        panel={
          <SidePanel
            onClose={() => useReaderSelection.getState().closePanel()}
            onTabChange={(tab) => useReaderSelection.getState().setPanelTab(tab)}
            tab={selection.panelTab}
          >
            <AyahPanelContent
              executor={executor}
              onTabChange={(tab) => useReaderSelection.getState().setPanelTab(tab)}
              onVerseChange={(key) => useReaderSelection.getState().selectVerse(key, placement)}
              tab={selection.panelTab}
              verseKey={selection.verseKey ?? visibleVerseKey ?? anchor.verseKey}
            />
          </SidePanel>
        }
        panelOpen={selection.panelOpen}
        resume={
          showResume ? (
            <ResumePill
              onPress={() => {
                if (selection.verseKey !== null) {
                  setPinnedVerseKey(selection.verseKey);
                }
              }}
            />
          ) : null
        }
        toolbar={
          <ReaderToolbar
              bookmarked={bookmarked}
              mode={mode}
              expanded={windowClass === 'expanded'}
              onAyahActions={() => selectVerse(selection.verseKey ?? visibleVerseKey ?? anchor.verseKey)}
              onBack={leaveReader}
              onBookmarkPage={() => {
                if (chrome.verseId === null) {
                  return;
                }
                try {
                  setBookmarkOverride({ verseId: chrome.verseId, value: toggleBookmark(chrome.verseId) !== null });
                } catch {
                  setBookmarkOverride({ verseId: chrome.verseId, value: false });
                }
              }}
              onOpenSettings={() => {
                void fetch('http://localhost:9799/settings').catch(() => undefined); // TEMP-DEBUG-BACK
                router.push('/reader-settings' as Href);
              }}
              onTogglePanel={() => useReaderSelection.getState().setPanelOpen(!useReaderSelection.getState().panelOpen)}
              panelOpen={selection.panelOpen}
              subtitle={subtitle}
              title={chrome.title}
            />
        }
        topInset={insets.top}
        verseKey={selection.verseKey}
      >
        <View style={{ flex: 1 }}>
          <ReaderModeFade mode={mode === 'mushaf' ? 'mushaf' : 'text'}>
            {executor !== null && mode === 'mushaf' ? (
              <HafsMushafList
                anchorVerseKey={listAnchor}
                bottomInset={0}
                fontScale={fontScale}
                onOpenAyahActions={selectVerse}
                onSelectVerseKey={selectVerse}
                onVisiblePage={(page, key) => {
                  // The page holding the ayah the reader is at keeps that ayah, not the page's first one, so a
                  // surah opened halfway down a page stays the saved place and the title.
                  const verseKey = pageForVerse(executor, anchor.verseKey) === page ? anchor.verseKey : key;
                  setVisibleVerseKey(verseKey);
                  anchor.setVisible({ page, verseKey });
                }}
                selectedVerseKey={selection.verseKey}
                testID="reader-mushaf"
                topInset={topInset}
              />
            ) : null}
            {executor !== null && mode === 'focus' ? (
              <FocusReader
                fontScale={fontScale}
                onOpenActions={selectVerse}
                onVerseChange={(key) => {
                  setPinnedVerseKey(key);
                  anchor.setVisible({ verseKey: key });
                }}
                topInset={topInset}
                verseKey={listAnchor}
              />
            ) : null}
            {executor !== null && mode === 'reading' ? (
              <ReadingList
                anchorVerseKey={listAnchor}
                bottomInset={0}
                fontScale={fontScale}
                horizontalGutter={gutter}
                mode="reading"
                onOpenAyahActions={selectVerse}
                onOpenTafsir={openTafsir}
                onSelectVerseKey={selectVerse}
                onVisibleVerseKey={(key) => {
                  setVisibleVerseKey(key);
                  anchor.setVisible({ verseKey: key });
                }}
                selectedVerseKey={selection.verseKey}
                testID="reader-reading"
                topInset={topInset}
              />
            ) : null}
          </ReaderModeFade>
        </View>
      </AdaptiveReaderLayout>
    </Screen>
  );
}
