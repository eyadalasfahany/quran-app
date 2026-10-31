import { type Href, router } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { openContentDb, useContentDb } from '@/core/db/content/open';
import { tabDestinations, type Destination, SectionScreen, useWindowClass } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { ContinueReadingCard } from '@/features/home/components/ContinueReadingCard';
import { ContinueReadingSkeleton } from '@/features/home/components/ContinueReadingSkeleton';
import { HomeTileRow } from '@/features/home/components/HomeTileRow';
import { RecentListensSection } from '@/features/home/components/RecentListensSection';
import { useRecentListenItems } from '@/features/home/data/recent-listen-items';
import { pause } from '@/features/audio/player';
import { usePlayerStore } from '@/features/audio/playerStore';
import { playRecentListen } from '@/features/audio/reciter-playback';
import { HomeWirdCard } from '@/features/khatma/components/HomeWirdCard';
import { planProgress, toLocalDateString, useActivePlan, usePlanLogs } from '@/features/khatma/data';
import { resolvePlanBounds } from '@/features/khatma/plan-bounds';
import { useLastReadVerseKey } from '@/features/reader/anchor/useLastReadVerseKey';
import { getChapter } from '@/features/reader/data/chapters';
import { getVerseByKey } from '@/features/reader/data/verses';
import { SearchButton, SkeletonGroup, type IconName } from '@/shared/ui';

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

export function HomeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { ready } = useContentDb();
  const lastReadVerseKey = useLastReadVerseKey();
  // Expanded windows keep search in the sidebar (MainShell), so the header drops its button there.
  const expanded = useWindowClass() === 'expanded';
  const recentItems = useRecentListenItems(2);
  // A recent listen is playing when the player holds its reciter and surah and is playing or loading it.
  const playerActive = usePlayerStore((state) => state.status === 'playing' || state.status === 'loading');
  const playerReciterId = usePlayerStore((state) => state.reciterId);
  const playerChapterId = usePlayerStore((state) => state.chapterId);
  const activePlan = useActivePlan().data[0] ?? null;
  const planLogs = usePlanLogs(activePlan?.id);
  const today = toLocalDateString(new Date());

  const homeWird = useMemo(() => {
    if (activePlan === null || !ready) {
      return null;
    }
    try {
      const executor = openContentDb().executor;
      const bounds = resolvePlanBounds(executor, activePlan.startVerseId);
      if (bounds === null) {
        return null;
      }
      const progress = planProgress(activePlan, planLogs.data, today, bounds.pagesTotal);
      return {
        dayIndex: progress.dayIndex,
        durationDays: activePlan.durationDays,
        pagesRead: progress.pagesRead,
        pagesTotal: progress.pagesTotal,
      };
    } catch {
      return null;
    }
  }, [activePlan, planLogs.data, ready, today]);

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

  return (
    <SectionScreen gutter={theme.size.gutterHome} testID="screen-home" title={t('home.greeting')} trailing={expanded ? undefined : <SearchButton onPress={() => router.push('/search')} testID="home-search" />}>
      {!ready ? (
        <SkeletonGroup testID="home-continue-loading">
          <ContinueReadingSkeleton testID="home-continue-reading-skeleton" />
        </SkeletonGroup>
      ) : null}
      {continueReading ? (
        <ContinueReadingCard
          ayah={continueReading.verse.verseNumber}
          juz={continueReading.verse.juz}
          onPress={() => router.push(`/read/${continueReading.verse.verseKey}` as Href)}
          page={continueReading.verse.page}
          surahName={continueReading.chapter.nameArabic}
        />
      ) : null}
      {homeWird ? (
        <HomeWirdCard
          dayIndex={homeWird.dayIndex}
          durationDays={homeWird.durationDays}
          onPress={() => router.push('/khatma' as Href)}
          pagesRead={homeWird.pagesRead}
          pagesTotal={homeWird.pagesTotal}
        />
      ) : null}
      <HomeTileRow
        tiles={[
          { icon: SURAHS_ICON, key: 'surahs', label: t('home.tiles.surahs'), onPress: () => router.navigate(tabHref('(mushaf)')) },
          { icon: SAVED_ICON, key: 'saved', label: t('home.tiles.saved'), onPress: () => router.navigate(tabHref('(my-quran)')) },
          { icon: RECITERS_ICON, key: 'reciters', label: t('home.tiles.reciters'), onPress: () => router.navigate(tabHref('(listen)')) },
        ]}
      />
      <RecentListensSection
        heading={t('home.recent.heading')}
        loading={!ready}
        items={recentItems.map((item) => {
          const playing =
            playerActive && playerReciterId === item.listen.reciterResourceId && playerChapterId === item.listen.chapterId;
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
            playLabel: playing ? t('player.pause') : item.playLabel,
            playing,
            subtitle: item.subtitle,
          };
        })}
      />
    </SectionScreen>
  );
}
