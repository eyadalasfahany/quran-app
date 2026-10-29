import { type Href, router, useSegments } from 'expo-router';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, useWindowDimensions } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { openContentDb } from '@/core/db/content/open';
import type { SqlExecutor } from '@/core/db/sql-executor';
import { formatNumber, type Locale } from '@/core/i18n';
import { useWindowClass } from '@/core/layout';
import { MiniPlayer } from '@/features/audio/components/MiniPlayer';
import { nextAyah, pause, previousAyah } from '@/features/audio/player';
import { usePlayerStore } from '@/features/audio/playerStore';
import { useAudioAvailable } from '@/features/audio/hooks/useAudioAvailable';
import { playVerse } from '@/features/audio/play-verse';
import { useMiniPlayerVisible } from '@/features/audio/hooks/useMiniPlayerVisible';
import { MINI_PLAYER_READER_FOOTPRINT } from '@/features/audio/mini-player-metrics';
import { listBookmarks, toggleBookmark, useHighlightsByVerseId } from '@/features/library/data';
import { Screen } from '@/shared/ui';

import { resolveInitialAnchor, writeReadingAnchor } from '../anchor/reading-anchor';
import { pageForVerse } from '../anchor/page';
import { useReadingAnchor } from '../anchor/useReadingAnchor';
import { AdaptiveReaderLayout } from '../components/AdaptiveReaderLayout';
import { FocusChrome } from '../components/FocusChrome';
import { FocusReader } from '../components/FocusReader';
import { ReaderModeFade } from '../components/ReaderModeFade';
import { READER_TOOLBAR_CLEARANCE, ReaderToolbar } from '../components/ReaderToolbar';
import { ResumePill } from '../components/ResumePill';
import { SidePanel } from '../components/SidePanel';
import { getChapter, listChapters } from '../data/chapters';
import { getVerseByKey } from '../data/verses';
import { HafsMushafList } from '../HafsMushafList';
import { panelPlacementFor, panelStripWidth } from '../layout';
import { AyahPanelContent } from '../panels/AyahPanelContent';
import { ReadingList } from '../ReadingList';
import type { ReaderMode } from '../anchor/reading-anchor';
import { useReaderSelection } from '../selection';
import { useScrollHaptics } from '../scroll-haptics';
import { useReaderSettings } from '../settings';
import { useRecitation } from '../useRecitation';
import { useRecitationFollow } from '../useRecitationFollow';

type ReaderChrome = {
  title: string;
  page: number | null;
  juz: number | null;
  verseId: number | null;
  place: { current: number; surah: string; total: number } | null;
};

function isAyahSheet(segment: string | undefined): boolean {
  return segment === 'ayah' || segment === 'tafsir';
}

function loadChrome(executor: SqlExecutor, verseKey: string, locale: Locale): ReaderChrome {
  const verse = getVerseByKey(executor, verseKey);
  if (verse === undefined) {
    return { juz: null, page: null, place: null, title: verseKey, verseId: null };
  }
  const chapter = getChapter(executor, verse.chapterId);
  const title = chapter === undefined ? verseKey : locale === 'ar' ? chapter.nameArabic : chapter.nameEn;
  const place = chapter === undefined ? null : { current: verse.verseNumber, surah: chapter.nameArabic, total: chapter.versesCount };
  return { juz: verse.juz, page: verse.page, place, title, verseId: verse.id };
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
  const highlights = useHighlightsByVerseId();
  const haptics = useScrollHaptics(mode);
  // The bar shows in Reading and Mushaf only. Focus has its own transport (step 5), and expanded windows get theirs in 4b2.
  const miniVisible = useMiniPlayerVisible('reader');
  const showMiniBar = miniVisible && (mode === 'reading' || mode === 'mushaf');
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
  const surahStartPages = useMemo(
    () => new Set(executor ? listChapters(executor).map((chapter) => chapter.pageStart) : []),
    [executor],
  );

  // The recitation: the ayah being recited, and whether the reader follows it (playing and not dragged away).
  const audioAvailable = useAudioAvailable();
  const { activeWord, recitedVerseKey, status } = useRecitation(executor);
  const follow = useRecitationFollow();
  const playing = status === 'playing';
  const active = status === 'playing' || status === 'loading';
  const followKey = follow.following && playing ? recitedVerseKey : null;

  const placement = panelPlacementFor(width, windowClass);
  const listAnchor = pinnedVerseKey ?? anchor.verseKey;
  // Focus shows one ayah at a time: while following, that ayah is the recited one.
  const focusKey = followKey ?? listAnchor;
  const { setVisible } = anchor;
  // Following in Focus also moves the saved place, as a manual turn does.
  useEffect(() => {
    if (mode === 'focus' && followKey !== null) {
      setVisible({ verseKey: followKey });
    }
  }, [followKey, mode, setVisible]);
  // The toolbar names the saved place, which follows the scroll even while the list is pinned.
  const chrome = useMemo(
    () =>
      executor === null
        ? { juz: null, page: null, place: null, title: anchor.verseKey, verseId: null }
        : loadChrome(executor, anchor.verseKey, locale),
    [executor, anchor.verseKey, locale],
  );
  const focusPosition =
    chrome.place === null
      ? chrome.title
      : t('reader.focus.position', {
          current: formatNumber(chrome.place.current, locale),
          surah: chrome.place.surah,
          total: formatNumber(chrome.place.total, locale),
        });
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
  // While playing, a drag away from the recited ayah shows the pill back to it, in every mode.
  const shownKey = focus ? listAnchor : visibleVerseKey;
  const recitingAway = playing && recitedVerseKey !== null && !follow.following && shownKey !== recitedVerseKey;
  const selectionPill =
    !focus &&
    selection.verseKey !== null &&
    visibleVerseKey !== null &&
    visibleVerseKey !== selection.verseKey &&
    pinnedVerseKey !== selection.verseKey;
  const showResume = !sheetOpen && (recitingAway || selectionPill);

  // Play from the focused ayah, or pause when the player is active.
  const playFocused = () => {
    if (active) {
      pause();
      return;
    }
    void playVerse(focusKey);
  };
  // A previous or next step in Focus also moves the recitation, when the player holds this surah.
  const stepRecitation = (key: string, way: 'next' | 'previous') => {
    const chapterId = executor === null ? undefined : getVerseByKey(executor, key)?.chapterId;
    if (chapterId === undefined || usePlayerStore.getState().chapterId !== chapterId) {
      return;
    }
    void (way === 'next' ? nextAyah() : previousAyah());
  };

  // Focus leaves the reader's toolbar; Back from Focus returns to the mode Focus was entered from.
  const setMode = useReaderSettings((state) => state.setMode);
  const focusReturn = useRef<ReaderMode>('mushaf');
  useEffect(() => {
    if (mode !== 'focus') {
      focusReturn.current = mode;
    }
  }, [mode]);

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
        miniPlayer={showMiniBar ? <MiniPlayer variant="reader" /> : undefined}
        resume={
          showResume ? (
            <ResumePill
              onPress={() => {
                if (recitingAway) {
                  follow.resume();
                  setPinnedVerseKey(null);
                  return;
                }
                if (selection.verseKey !== null) {
                  setPinnedVerseKey(selection.verseKey);
                }
              }}
            />
          ) : null
        }
        toolbar={
          focus ? (
            <FocusChrome onExit={() => setMode(focusReturn.current)} position={focusPosition} />
          ) : (
          <ReaderToolbar
              bookmarked={bookmarked}
              mode={mode}
              windowClass={windowClass}
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
              onOpenSettings={() => router.push('/reader-settings' as Href)}
              onTogglePanel={() => useReaderSelection.getState().setPanelOpen(!useReaderSelection.getState().panelOpen)}
              panelOpen={selection.panelOpen}
              subtitle={subtitle}
              title={chrome.title}
            />
          )
        }
        topInset={insets.top}
        verseKey={selection.verseKey}
      >
        <View style={{ flex: 1 }}>
          <ReaderModeFade mode={mode === 'mushaf' ? 'mushaf' : 'text'}>
            {executor !== null && mode === 'mushaf' ? (
              <HafsMushafList
                anchorVerseKey={followKey ?? listAnchor}
                bottomInset={0}
                contentBottomInset={showMiniBar ? MINI_PLAYER_READER_FOOTPRINT : 0}
                fontScale={fontScale}
                highlightsByVerseId={highlights}
                onOpenAyahActions={selectVerse}
                onSelectVerseKey={selectVerse}
                onUserScrollEnd={follow.onUserScrollEnd}
                onUserScrollStart={follow.onUserScrollStart}
                onVisiblePage={(page, key) => {
                  // The page holding the ayah the reader is at keeps that ayah, not the page's first one, so a
                  // surah opened halfway down a page stays the saved place and the title.
                  const verseKey = pageForVerse(executor, anchor.verseKey) === page ? anchor.verseKey : key;
                  setVisibleVerseKey(verseKey);
                  anchor.setVisible({ page, verseKey });
                  haptics.onPage(page, surahStartPages.has(page));
                }}
                recitedVerseKey={recitedVerseKey}
                recitedWord={activeWord}
                selectedVerseKey={selection.verseKey}
                testID="reader-mushaf"
                topInset={topInset}
              />
            ) : null}
            {executor !== null && mode === 'focus' ? (
              <FocusReader
                activeWord={activeWord}
                fontScale={fontScale}
                highlightsByVerseId={highlights}
                onOpenActions={selectVerse}
                onPlay={audioAvailable ? playFocused : undefined}
                onStep={stepRecitation}
                onUserMove={follow.onUserScrollStart}
                onUserMoveEnd={follow.onUserScrollEnd}
                onVerseChange={(key) => {
                  setPinnedVerseKey(key);
                  anchor.setVisible({ verseKey: key });
                }}
                playing={active}
                recitedVerseKey={recitedVerseKey}
                topInset={topInset}
                verseKey={focusKey}
              />
            ) : null}
            {executor !== null && mode === 'reading' ? (
              <ReadingList
                activeWord={activeWord}
                anchorVerseKey={listAnchor}
                audioAvailable={audioAvailable}
                bottomInset={0}
                contentBottomInset={showMiniBar ? MINI_PLAYER_READER_FOOTPRINT : 0}
                fontScale={fontScale}
                followKey={followKey}
                highlightsByVerseId={highlights}
                horizontalGutter={gutter}
                mode="reading"
                onOpenAyahActions={selectVerse}
                onOpenTafsir={openTafsir}
                onPlayVerseKey={(key) => void playVerse(key)}
                onSelectVerseKey={selectVerse}
                onUserScrollEnd={follow.onUserScrollEnd}
                onUserScrollStart={follow.onUserScrollStart}
                onVisibleVerseKey={(key) => {
                  setVisibleVerseKey(key);
                  anchor.setVisible({ verseKey: key });
                  haptics.onVerse(key);
                }}
                recitedVerseKey={recitedVerseKey}
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
