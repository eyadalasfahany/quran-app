import { type Href, router, useSegments } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContext } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { openContentDb } from '@/core/db/content/open';
import type { SqlExecutor } from '@/core/db/sql-executor';
import { formatNumber, type Locale } from '@/core/i18n';
import { useWindowClass } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { listBookmarks, toggleBookmark } from '@/features/library/data';

import { resolveInitialAnchor, writeReadingAnchor } from '../anchor/reading-anchor';
import { pageForVerse } from '../anchor/page';
import { useReadingAnchor } from '../anchor/useReadingAnchor';
import { AdaptiveReaderLayout } from '../components/AdaptiveReaderLayout';
import { AyahPanelPlaceholder } from '../components/AyahPanelPlaceholder';
import { ReaderModeFade } from '../components/ReaderModeFade';
import { READER_TOOLBAR_CLEARANCE, ReaderToolbar } from '../components/ReaderToolbar';
import { ResumePill } from '../components/ResumePill';
import { SidePanel } from '../components/SidePanel';
import { getChapter } from '../data/chapters';
import { getVerseByKey, idToVerseKey, verseKeyToId } from '../data/verses';
import { mushafSideGutter, panelPlacementFor, panelStripWidth } from '../layout';
import { MushafList } from '../MushafList';
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
  const theme = useTheme();
  const insets = useContext(SafeAreaInsetsContext) ?? { bottom: 0, left: 0, right: 0, top: 0 };
  const segments = useSegments();
  const width = useWindowDimensions().width;
  const windowClass = useWindowClass();
  const locale: Locale = i18n.language === 'en' ? 'en' : 'ar';
  const seeded = useRef(false);
  if (!seeded.current) {
    writeReadingAnchor(resolveInitialAnchor({ verseKey }));
    seeded.current = true;
  }
  const anchor = useReadingAnchor();
  const mode = useReaderSettings((state) => state.mode);
  const fontScale = useReaderSettings((state) => state.fontScale);
  const showTranslations = useReaderSettings((state) => state.showTranslations);
  const translationIds = useReaderSettings((state) => state.translationIds);
  const selection = useReaderSelection();
  const [visibleVerseKey, setVisibleVerseKey] = useState<string | null>(null);
  const [pinnedVerseKey, setPinnedVerseKey] = useState<string | null>(null);
  const [bookmarked, setBookmarked] = useState(false);

  const executor = useMemo(() => {
    try {
      return openContentDb().executor;
    } catch {
      return null;
    }
  }, []);

  const placement = panelPlacementFor(width, windowClass);
  const listAnchor = pinnedVerseKey ?? anchor.verseKey;
  const chrome = useMemo(
    () => (executor === null ? { juz: null, page: null, title: listAnchor, verseId: null } : loadChrome(executor, listAnchor, locale)),
    [executor, listAnchor, locale],
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

  useEffect(() => {
    if (chrome.verseId === null) {
      return;
    }
    try {
      setBookmarked(listBookmarks().some((bookmark) => bookmark.verseId === chrome.verseId));
    } catch {
      setBookmarked(false);
    }
  }, [chrome.verseId]);

  const selectVerse = (key: string) => {
    useReaderSelection.getState().selectVerse(key, placement);
    if (placement === 'sheet') {
      router.push(`/ayah/${key}` as Href);
    }
  };

  const showResume =
    selection.verseKey !== null &&
    visibleVerseKey !== null &&
    visibleVerseKey !== selection.verseKey &&
    pinnedVerseKey !== selection.verseKey;

  const gutter = placement === 'docked' ? panelStripWidth() : 0;
  const topInset = insets.top + READER_TOOLBAR_CLEARANCE;

  return (
    <View
      accessibilityLabel={anchor.verseKey}
      style={{ backgroundColor: theme.colors.surface, flex: 1 }}
      testID="reader-screen"
    >
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
            <AyahPanelPlaceholder tab={selection.panelTab} />
          </SidePanel>
        }
        panelOpen={selection.panelOpen}
        toolbar={
          <ReaderToolbar
            bookmarked={bookmarked}
            expanded={windowClass === 'expanded'}
            onAyahActions={() => selectVerse(selection.verseKey ?? visibleVerseKey ?? anchor.verseKey)}
            onBack={() => router.back()}
            onBookmarkPage={() => {
              if (chrome.verseId === null) {
                return;
              }
              try {
                setBookmarked(toggleBookmark(chrome.verseId) !== null);
              } catch {
                setBookmarked(false);
              }
            }}
            onOpenSettings={() => router.push('/reader-settings' as Href)}
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
              <MushafList
                anchorVerseKey={listAnchor}
                bottomInset={0}
                horizontalGutter={mushafSideGutter(gutter)}
                onOpenAyahActions={(verseId) => {
                  const key = idToVerseKey(executor, verseId);
                  if (key !== undefined) {
                    selectVerse(key);
                  }
                }}
                onSelectVerseId={(verseId) => {
                  const key = idToVerseKey(executor, verseId);
                  if (key !== undefined) {
                    selectVerse(key);
                  }
                }}
                onSwitchToReading={() => useReaderSettings.getState().setMode('reading')}
                onVisiblePage={(page, key) => {
                  setVisibleVerseKey(key);
                  anchor.setVisible({ page, verseKey: key });
                }}
                selectedVerseId={selection.verseKey === null ? null : (verseKeyToId(executor, selection.verseKey) ?? null)}
                testID="reader-mushaf"
                topInset={topInset}
              />
            ) : null}
            {executor !== null && mode !== 'mushaf' ? (
              <ReadingList
                anchorVerseKey={listAnchor}
                bottomInset={0}
                fontScale={fontScale}
                horizontalGutter={gutter}
                mode={mode}
                onOpenAyahActions={selectVerse}
                onSelectVerseKey={selectVerse}
                onVisibleVerseKey={(key) => {
                  setVisibleVerseKey(key);
                  anchor.setVisible({ verseKey: key });
                }}
                selectedVerseKey={selection.verseKey}
                testID="reader-reading"
                topInset={topInset}
                translationResourceIds={showTranslations ? translationIds : []}
              />
            ) : null}
          </ReaderModeFade>
          {showResume ? (
            <View
              pointerEvents="box-none"
              style={{ alignItems: 'center', bottom: theme.space[4], left: 0, position: 'absolute', right: 0 }}
            >
              <ResumePill
                onPress={() => {
                  if (selection.verseKey !== null) {
                    setPinnedVerseKey(selection.verseKey);
                  }
                }}
              />
            </View>
          ) : null}
        </View>
      </AdaptiveReaderLayout>
    </View>
  );
}
