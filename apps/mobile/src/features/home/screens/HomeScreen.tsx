import { type Href, router } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';

import { openContentDb, useContentDb } from '@/core/db/content/open';
import {
  tabDestinations,
  type Destination,
  SectionScreen,
  useTabBarScrollHandlers,
  useTabContentBottom,
} from '@/core/layout';
import { useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { useAzkarAvailable, useRecentAzkarItems } from '@/features/azkar/data';
import { azkarHref } from '@/features/azkar/routes';
import { useDuasAvailable } from '@/features/duas/data/hooks';
import { duasHref } from '@/features/duas/routes';
import { pause } from '@/features/audio/player';
import { isStartingFor, listenMatch, useStartState } from '@/features/audio/hooks/useIsStarting';
import { usePlayerStore } from '@/features/audio/playerStore';
import { playRecentListen } from '@/features/audio/reciter-playback';
import { DiscoverHomeCard } from '@/features/discover/components/DiscoverHomeCard';
import { ContinueAzkarHomeCard } from '@/features/home/components/ContinueAzkarHomeCard';
import { ContinueReadingCard } from '@/features/home/components/ContinueReadingCard';
import { ContinueReadingSkeleton } from '@/features/home/components/ContinueReadingSkeleton';
import { DailyProgressCard } from '@/features/home/components/DailyProgressCard';
import { HomeTileRow } from '@/features/home/components/HomeTileRow';
import { HomeNextPrayer } from '@/features/home/components/HomeNextPrayer';
import { RecentAzkarSection } from '@/features/home/components/RecentAzkarSection';
import { RecentListensSection } from '@/features/home/components/RecentListensSection';
import { SelectedAzkarSection } from '@/features/home/components/SelectedAzkarSection';
import { useRecentListenItems } from '@/features/home/data/recent-listen-items';
import { useDailyProgress } from '@/features/home/hooks/useDailyProgress';
import { useHomeWird } from '@/features/home/hooks/useHomeWird';
import { useDailyGoals } from '@/features/daily-goals/hooks/useDailyGoals';
import { useSelectedAzkarItems } from '@/features/home/hooks/useSelectedAzkar';
import { HomeWirdCard } from '@/features/khatma/components/HomeWirdCard';
import { useLastReadVerseKey } from '@/features/reader/anchor/useLastReadVerseKey';
import { chapterDisplayName, getChapter } from '@/features/reader/data/chapters';
import { getVerseByKey } from '@/features/reader/data/verses';
import { useAzkarMenuPreview } from '@/features/menu/hooks/useAzkarMenuPreview';
import { HomeDatePill } from '@/features/hijri/components/HomeDatePill';
import { useHijriDate } from '@/features/hijri/hooks/useHijriDate';
import { isHijriCalendarAvailable } from '@/features/hijri/data/hijri-date';
import { useStaleContent } from '@/core/sync/useStaleContent';
import { SearchButton, SkeletonGroup, StaleContentBanner, type IconName } from '@/shared/ui';

// Home's tiles open the tabs they name. Only shipped features get a tile (ADR 0017).
function tabHref(name: Destination['name']): Href {
  const destination = tabDestinations.find((item) => item.name === name);
  if (destination === undefined) {
    throw new Error(`Unknown tab ${name}`);
  }
  return destination.href;
}

const SURAHS_ICON: IconName = { ios: 'list.bullet', android: 'format_list_bulleted' };
const SAVED_ICON: IconName = { ios: 'bookmark', android: 'bookmark' };
const RECITERS_ICON: IconName = { ios: 'headphones', android: 'headphones' };
const AZKAR_ICON: IconName = { ios: 'circle.dotted', android: 'scatter_plot' };
const DUAS_ICON: IconName = { ios: 'hands.sparkles', android: 'volunteer_activism' };
const SIBHA_ICON: IconName = { ios: 'circle.circle', android: 'adjust' };

/**
 * Home (quran-app-screens.html, #Main; ADR 0034 §7). Top to bottom: continue reading, the next prayer, continue Azkar,
 * today's progress, the tiles, selected Azkar, recent Azkar, and recent listens. Every Azkar block hides without Azkar
 * content. The list scrolls under the tab bar and the mini player, and its end clears both (`useTabContentBottom`).
 */
export function HomeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const { ready } = useContentDb();
  const lastReadVerseKey = useLastReadVerseKey();
  const tabScroll = useTabBarScrollHandlers();
  const bottom = useTabContentBottom();
  const recentItems = useRecentListenItems(2);
  // A recent listen is playing when the player holds its reciter and surah and is playing or loading it.
  const playerActive = usePlayerStore((state) => state.status === 'playing' || state.status === 'loading');
  const playerReciterId = usePlayerStore((state) => state.reciterId);
  const playerChapterId = usePlayerStore((state) => state.chapterId);
  const startState = useStartState();
  // The Azkar blocks show only once Azkar content is installed (ADR 0017, ADR 0031 §10).
  const azkarAvailable = useAzkarAvailable();
  const duasAvailable = useDuasAvailable();
  const homeWird = useHomeWird();
  const { goals } = useDailyGoals();
  const continueAzkar = useAzkarMenuPreview().resume;
  const progress = useDailyProgress();
  // The quiet notice that the content has not been checked for over seven days (spec §7, hop 3, item 6).
  const stale = useStaleContent();
  const selectedAzkar = useSelectedAzkarItems();
  const recentAzkar = useRecentAzkarItems(locale);
  // Stable, so the memoised next-prayer card does not re-render for a new callback identity.
  const openSalah = useCallback(() => router.push('/salah' as Href), []);

  const continueReading = useMemo(() => {
    if (!ready) {
      return undefined;
    }
    try {
      const executor = openContentDb().executor;
      const verse = getVerseByKey(executor, lastReadVerseKey);
      const chapter = verse === undefined ? undefined : getChapter(executor, verse.chapterId);
      if (verse === undefined || chapter === undefined) {
        return undefined;
      }
      return { chapter, verse };
    } catch {
      return undefined;
    }
  }, [lastReadVerseKey, ready]);

  const tiles = [
    { icon: SURAHS_ICON, key: 'surahs', label: t('home.tiles.surahs'), onPress: () => router.navigate(tabHref('(mushaf)')) },
    ...(azkarAvailable
      ? [{ icon: AZKAR_ICON, key: 'azkar', label: t('home.tiles.azkar'), onPress: () => router.push(azkarHref.home) }]
      : []),
    ...(duasAvailable
      ? [{ icon: DUAS_ICON, key: 'duas', label: t('home.tiles.duas'), onPress: () => router.push(duasHref.home) }]
      : []),
    // Misbaha has no religious content, so its tile does not wait for Azkar content.
    { icon: SIBHA_ICON, key: 'sibha', label: t('home.tiles.misbaha'), onPress: () => router.push('/sibha' as Href) },
    { icon: SAVED_ICON, key: 'saved', label: t('home.tiles.saved'), onPress: () => router.navigate(tabHref('(my-quran)')) },
    { icon: RECITERS_ICON, key: 'reciters', label: t('home.tiles.reciters'), onPress: () => router.navigate(tabHref('(listen)')) },
  ];

  // The Hijri date pill (ADR 0048): today's date with the user's adjustment; hidden when the platform has no calendar.
  const hijriDate = useHijriDate();
  const hijriAvailable = isHijriCalendarAvailable();

  return (
    <SectionScreen gutter={theme.size.gutterHome} testID="screen-home" title={t('home.greeting')} trailing={<SearchButton onPress={() => router.push('/search')} testID="home-search" />}>
      <ScrollView
        contentContainerStyle={{ gap: theme.size.sectionGap, paddingBottom: bottom + theme.space[4] }}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        testID="home-scroll"
        {...tabScroll}
      >
        <StaleContentBanner visible={stale} />
        {hijriAvailable ? (
          <HomeDatePill
            label={t('hijri.home.pillLabel', { date: hijriDate })}
            onPress={() => router.push('/hijri' as Href)}
            text={hijriDate}
          />
        ) : null}
        <DiscoverHomeCard />
        {!ready ? (
          <SkeletonGroup testID="home-continue-loading">
            <ContinueReadingSkeleton testID="home-continue-reading-skeleton" />
          </SkeletonGroup>
        ) : null}
        {continueReading ? (
          <ContinueReadingCard
            ayah={continueReading.verse.verseNumber}
            juz={continueReading.verse.juz}
            onPress={() => router.push(`/read/${continueReading.verse.verseKey}?place=1` as Href)}
            page={continueReading.verse.page}
            surahName={chapterDisplayName(continueReading.chapter, locale)}
          />
        ) : null}
        <HomeNextPrayer onPress={openSalah} />
        {azkarAvailable && continueAzkar ? (
          <ContinueAzkarHomeCard
            onPress={() => router.push(continueAzkar.href)}
            resume={{
              caption: continueAzkar.caption,
              preview: continueAzkar.preview,
              progress: continueAzkar.progress ?? 0,
              title: continueAzkar.title,
            }}
          />
        ) : null}
        <DailyProgressCard
          lines={progress.lines}
          onOpenGoals={() => router.push('/daily-goals' as Href)}
          percent={progress.percent}
        />
        {/* The wird card shows only while the wird is not a tracked goal; a tracked wird is the progress row. */}
        {homeWird && !goals.wird ? (
          <HomeWirdCard
            dayIndex={homeWird.dayIndex}
            durationDays={homeWird.durationDays}
            onPress={() => router.push('/khatma' as Href)}
            pagesRead={homeWird.pagesRead}
            pagesTotal={homeWird.pagesTotal}
          />
        ) : null}
        <HomeTileRow tiles={tiles} />
        <SelectedAzkarSection
          items={selectedAzkar}
          onOpen={(id) => router.push(azkarHref.category(id))}
          onSeeAll={() => router.push(azkarHref.home)}
        />
        {azkarAvailable ? <RecentAzkarSection items={recentAzkar} onOpen={(href) => router.push(href)} /> : null}
        <RecentListensSection
          heading={t('home.recent.heading')}
          loading={!ready}
          items={recentItems.map((item) => {
            const playing =
              playerActive && playerReciterId === item.listen.reciterResourceId && playerChapterId === item.listen.chapterId;
            const starting = isStartingFor(startState, listenMatch(item.listen.reciterResourceId, item.listen.chapterId));
            return {
              key: item.key,
              letter: item.letter,
              name: item.name,
              onPlay: () => {
                if (playing) {
                  pause();
                  return;
                }
                void playRecentListen(item.listen, item.installed);
              },
              playLabel: playing || starting ? t('player.pause') : item.playLabel,
              playing,
              starting,
              subtitle: item.subtitle,
            };
          })}
        />
      </ScrollView>
    </SectionScreen>
  );
}
