import { type Href, router, useSegments } from 'expo-router';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, useWindowDimensions } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { openContentDb } from '@/core/db/content/open';
import type { SqlExecutor } from '@/core/db/sql-executor';
import { formatNumber, type Locale } from '@/core/i18n';
import { useWindowClass } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { MiniPlayer } from '@/features/audio/components/MiniPlayer';
import { nextAyah, pause, previousAyah } from '@/features/audio/player';
import { usePlayerStore } from '@/features/audio/playerStore';
import { useAudioAvailable } from '@/features/audio/hooks/useAudioAvailable';
import { playVerse } from '@/features/audio/play-verse';
import { KhatmaMarkedPill } from '@/features/khatma/components/KhatmaMarkedPill';
import { useActivePlan, useKhatmaMarkerVerseId } from '@/features/khatma/data';
import { subscribeKhatmaMarkedNotice } from '@/features/khatma/marked-notice';
import { listBookmarks, toggleBookmark, useHighlightsByVerseId } from '@/features/library/data';
import { Screen } from '@/shared/ui';

import { resolveInitialAnchor, writePlayedPlace, writeReadingAnchor } from '../anchor/reading-anchor';
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
import { getVerseByKey, idToVerseKey } from '../data/verses';
import { HafsMushafList } from '../HafsMushafList';
import { panelPlacementFor, panelStripWidth } from '../layout';
import { AyahPanelContent } from '../panels/AyahPanelContent';
import { ReadingList } from '../ReadingList';
import type { ReaderMode } from '../anchor/reading-anchor';
import { useReaderMiniFootprint } from '../useReaderMiniFootprint';
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

function recitedKeyNow(): string | null {
  const player = usePlayerStore.getState();
  if ((player.status !== 'playing' && player.status !== 'loading') || player.activeVerseId === null) {
    return null;
  }
  try {
    return idToVerseKey(openContentDb().executor, player.activeVerseId) ?? null;
  } catch {
    return null;
  }
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
  const theme = useTheme();
  const locale: Locale = i18n.language === 'en' ? 'en' : 'ar';
  // Opening a surah while audio plays shows that surah. The recited ayah stays the continue-reading place,
  // and the reader moves to it only from the return control.
  const [openedAway] = useState(() => {
    const route = resolveInitialAnchor({ verseKey });
    const playingKey = recitedKeyNow();
    const away = playingKey !== null && route.verseKey !== playingKey;
    if (!away) {
      writeReadingAnchor(route);
    }
    return away;
  });
  const anchor = useReadingAnchor();
  const mode = useReaderSettings((state) => state.mode);
  const fontScale = useReaderSettings((state) => state.fontScale);
  const tafsirId = useReaderSettings((state) => state.tafsirId);
  const selection = useReaderSelection();
  const inlineTafsirOpen = useReaderSelection((state) => state.inlineTafsirOpen);
  const highlights = useHighlightsByVerseId();
  const activeKhatmaPlan = useActivePlan().data[0] ?? null;
  const khatmaMarkerVerseId = useKhatmaMarkerVerseId(activeKhatmaPlan?.id);
  const [showMarkedPill, setShowMarkedPill] = useState(false);
  const onKhatmaMarked = useCallback(() => {
    setShowMarkedPill(true);
  }, []);
  useEffect(() => subscribeKhatmaMarkedNotice(onKhatmaMarked), [onKhatmaMarked]);
  const haptics = useScrollHaptics(mode);
  // The bar (or its collapsed capsule) shows in Reading and Mushaf only, and its footprint comes from one hook, so the
  // dock, the resume pill and the lists' insets agree. Focus has its own transport.
  const mini = useReaderMiniFootprint();
  const showMiniBar = mini.shown;
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
  const follow = useRecitationFollow(!openedAway);
  const playing = status === 'playing';
  const active = status === 'playing' || status === 'loading';
  const followKey = follow.following && playing ? recitedVerseKey : null;

  const placement = panelPlacementFor(width, windowClass);
  const routeVerseKey = resolveInitialAnchor({ verseKey }).verseKey;
  // The page on screen: the recited ayah while following, otherwise the surah that was opened or the saved place.
  const viewKey = followKey ?? pinnedVerseKey ?? (openedAway ? routeVerseKey : anchor.verseKey);
  const focusKey = viewKey;
  const { setVisible } = anchor;
  // Listening owns the continue-reading place whenever an ayah is playing, including when this screen is showing
  // another surah. The reader's own scroll writes the place only while nothing is playing.
  useEffect(() => {
    if (!active || recitedVerseKey === null) {
      return;
    }
    const page = executor === null ? null : (pageForVerse(executor, recitedVerseKey) ?? null);
    writePlayedPlace(recitedVerseKey, page);
    if (follow.following) {
      setVisible({ page, verseKey: recitedVerseKey });
    }
  }, [active, executor, follow.following, recitedVerseKey, setVisible]);
  const chrome = useMemo(
    () =>
      executor === null
        ? { juz: null, page: null, place: null, title: viewKey, verseId: null }
        : loadChrome(executor, viewKey, locale),
    [executor, viewKey, locale],
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
    // setMode persists whatever verse the anchor held. Playing keeps the recited ayah in front of that.
    if (active && recitedVerseKey !== null) {
      writePlayedPlace(recitedVerseKey, executor === null ? null : (pageForVerse(executor, recitedVerseKey) ?? null));
    }
  }, [active, anchor, executor, mode, recitedVerseKey]);

  useEffect(() => {
    // Following sets the recited ayah's page itself (above); this would write the stale anchor over it.
    if (executor === null || mode !== 'mushaf' || anchor.page !== null || followKey !== null || openedAway || active) {
      return;
    }
    const page = pageForVerse(executor, anchor.verseKey);
    if (page !== undefined) {
      anchor.setVisible({ page, verseKey: anchor.verseKey });
    }
  }, [active, anchor, executor, followKey, mode, openedAway]);

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

  const onReadingTafsir = (key: string) => {
    useReaderSelection.getState().selectVerse(key, placement);
    useReaderSelection.getState().toggleInlineTafsir();
  };

  // A sheet covers the reader without changing it: the toolbar stays, the page keeps its inset and scroll,
  // and the resume pill stays hidden while the sheet is open.
  const sheetOpen = segments.some((segment) => segment === 'reader-settings' || segment === 'ayah' || segment === 'tafsir');
  const focus = mode === 'focus';
  const shownKey = focus ? viewKey : visibleVerseKey;
  const recitingAway = playing && recitedVerseKey !== null && !follow.following && shownKey !== recitedVerseKey;
  const showResume = !sheetOpen && recitingAway;

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

  // The strip is reserved only while a docked panel is open, matching AdaptiveReaderLayout.
  const gutter = placement === 'docked' && selection.panelOpen ? panelStripWidth() : 0;
  const topInset = insets.top + READER_TOOLBAR_CLEARANCE;

  return (
    <Screen accessibilityLabel={viewKey} surface="surfacePage" testID="reader-screen" topInset={false}>
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
              onKhatmaMarked={onKhatmaMarked}
              onTabChange={(tab) => useReaderSelection.getState().setPanelTab(tab)}
              onVerseChange={(key) => useReaderSelection.getState().selectVerse(key, placement)}
              tab={selection.panelTab}
              verseKey={selection.verseKey ?? visibleVerseKey ?? viewKey}
            />
          </SidePanel>
        }
        panelOpen={selection.panelOpen}
        miniPlayer={showMiniBar ? <MiniPlayer topVerseKey={visibleVerseKey ?? viewKey} variant="reader" /> : undefined}
        resume={
          showMarkedPill || showResume ? (
            <View style={{ alignItems: 'center', gap: theme.space[2] }}>
              {showMarkedPill ? <KhatmaMarkedPill onDone={() => setShowMarkedPill(false)} /> : null}
              {showResume ? (
                <ResumePill
                  onPress={() => {
                    follow.resume();
                    setPinnedVerseKey(null);
                  }}
                />
              ) : null}
            </View>
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
              onAyahActions={() => selectVerse(selection.verseKey ?? visibleVerseKey ?? viewKey)}
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
                anchorVerseKey={viewKey}
                bottomInset={0}
                contentBottomInset={mini.footprint}
                fontScale={fontScale}
                followKey={followKey}
                highlightsByVerseId={highlights}
                khatmaMarkerVerseId={khatmaMarkerVerseId}
                onOpenAyahActions={selectVerse}
                onSelectVerseKey={selectVerse}
                onUserScrollStart={follow.onUserScrollStart}
                onVisiblePage={(page, key) => {
                  // The page holding the ayah the reader is at keeps that ayah, not the page's first one, so a
                  // surah opened halfway down a page stays the saved place and the title.
                  const verseKey = pageForVerse(executor, viewKey) === page ? viewKey : key;
                  setVisibleVerseKey(verseKey);
                  // While audio plays, listening keeps the continue-reading place. Scroll writes it only when idle.
                  if (followKey === null && !active) {
                    anchor.setVisible({ page, verseKey });
                  }
                  haptics.onPage(page, surahStartPages.has(page));
                }}
                recitedVerseKey={recitedVerseKey}
                recitedWord={activeWord}
                testID="reader-mushaf"
                topInset={topInset}
              />
            ) : null}
            {executor !== null && mode === 'focus' ? (
              <FocusReader
                activeWord={activeWord}
                following={followKey !== null}
                fontScale={fontScale}
                highlightsByVerseId={highlights}
                onOpenActions={selectVerse}
                onPlay={audioAvailable ? playFocused : undefined}
                onStep={stepRecitation}
                onUserMove={follow.onUserScrollStart}
                onVerseChange={(key) => {
                  setPinnedVerseKey(key);
                  if (!active) {
                    anchor.setVisible({ verseKey: key });
                  }
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
                anchorVerseKey={viewKey}
                audioAvailable={audioAvailable}
                bottomInset={0}
                contentBottomInset={mini.footprint}
                fontScale={fontScale}
                followKey={followKey}
                highlightsByVerseId={highlights}
                khatmaMarkerVerseId={khatmaMarkerVerseId}
                horizontalGutter={gutter}
                mode="reading"
                onOpenAyahActions={selectVerse}
                onOpenTafsir={onReadingTafsir}
                showInlineTafsir={inlineTafsirOpen}
                tafsirId={tafsirId}
                onPause={pause}
                onPlayVerseKey={(key) => void playVerse(key)}
                onSelectVerseKey={selectVerse}
                onUserScrollStart={follow.onUserScrollStart}
                onVisibleVerseKey={(key) => {
                  setVisibleVerseKey(key);
                  if (followKey === null && !active) {
                    anchor.setVisible({ verseKey: key });
                  }
                  haptics.onVerse(key);
                }}
                playing={playing}
                recitedVerseKey={recitedVerseKey}
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
