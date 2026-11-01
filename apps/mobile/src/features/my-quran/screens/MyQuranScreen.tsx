import { type Href, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';

import { openContentDb, useContentDb } from '@/core/db/content/open';
import { SectionScreen, useTabBarClearance } from '@/core/layout';
import { useTheme } from '@/core/theme';
import { useAllHighlights, useAllNotes, useBookmarks } from '@/features/library/data';
import { KhatmaSummaryCard } from '@/features/khatma/components/KhatmaSummaryCard';
import {
  planProgress,
  toLocalDateString,
  useActivePlan,
  usePlanLogs,
} from '@/features/khatma/data';
import { resolvePlanBounds } from '@/features/khatma/plan-bounds';
import { IconButton } from '@/shared/ui';

import { BookmarkListCard } from '../components/BookmarkListCard';
import { HighlightListCard } from '../components/HighlightListCard';
import { MyQuranTabs, type MyQuranTab } from '../components/MyQuranTabs';
import { NoteListCard } from '../components/NoteListCard';
import {
  resolveSavedVerses,
  type SavedBookmarkItem,
  type SavedHighlightItem,
  type SavedNoteItem,
} from '../data/saved-items';

const SETTINGS_ICON = { ios: 'gearshape', android: 'settings' } as const;

/**
 * «مصحفي» (#MyQuran): the bookmarks, highlights and notes the reader saved, under one segment.
 * «ختمة» stays disabled until step 3. Local-only (ADR 0027): no sign-in banner.
 */
export function MyQuranScreen({ testID = 'screen-my-quran' }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const barClearance = useTabBarClearance();
  const { ready } = useContentDb();
  const bookmarks = useBookmarks();
  const highlights = useAllHighlights();
  const notes = useAllNotes();
  const [activeTab, setActiveTab] = useState<MyQuranTab>('bookmarks');
  const activePlan = useActivePlan().data[0] ?? null;
  const planLogs = usePlanLogs(activePlan?.id);
  const today = toLocalDateString(new Date());

  // Joins wait for the content database; until then every tab draws its empty state. The try/catch
  // mirrors IndexScreen: under Jest openContentDb throws, and the tabs draw their empty states.
  const { bookmark, highlightItems, noteItems } = useMemo(() => {
    const empty: {
      bookmark: SavedBookmarkItem | null;
      highlightItems: SavedHighlightItem[];
      noteItems: SavedNoteItem[];
    } = { bookmark: null, highlightItems: [], noteItems: [] };
    if (!ready) {
      return empty;
    }
    let executor;
    try {
      executor = openContentDb().executor;
    } catch {
      return empty;
    }
    return {
      bookmark: resolveSavedVerses(executor, bookmarks.data)[0] ?? null,
      highlightItems: resolveSavedVerses(executor, highlights.data),
      noteItems: resolveSavedVerses(executor, notes.data),
    };
  }, [bookmarks.data, highlights.data, notes.data, ready]);

  const khatmaSummary = useMemo(() => {
    if (activePlan === null || !ready) {
      return { active: false as const };
    }
    try {
      const executor = openContentDb().executor;
      const bounds = resolvePlanBounds(executor, activePlan.startVerseId);
      if (bounds === null) {
        return { active: false as const };
      }
      const progress = planProgress(activePlan, planLogs.data, today, bounds.pagesTotal);
      const todayLog = planLogs.data.find((log) => log.date === today);
      return {
        active: true as const,
        dayIndex: progress.dayIndex,
        durationDays: activePlan.durationDays,
        pagesLoggedToday: todayLog?.pagesRead ?? 0,
        todayTarget: progress.todayTarget,
      };
    } catch {
      return { active: false as const };
    }
  }, [activePlan, planLogs.data, ready, today]);

  const openVerse = (verseKey: string) => router.push(`/read/${verseKey}` as Href);
  const editNote = (verseKey: string) => router.push(`/ayah/${verseKey}` as Href);
  const openMushaf = () => router.navigate('/(main)/(mushaf)' as Href);

  return (
    <SectionScreen
      testID={testID}
      title={t('tabs.myQuran')}
      trailing={
        <IconButton
          icon={SETTINGS_ICON}
          label={t('settings.title')}
          onPress={() => router.push('/settings' as Href)}
          testID="my-quran-settings"
          variant="raised"
        />
      }
    >
      <MyQuranTabs onChange={setActiveTab} value={activeTab} />
      <ScrollView
        contentContainerStyle={{ gap: theme.space[3], paddingBottom: barClearance + theme.space[4] }}
        style={{ flex: 1 }}
        testID={`${testID}-list`}
      >
        {activeTab === 'bookmarks' ? (
          <BookmarkListCard item={bookmark} onOpenMushaf={openMushaf} onOpenVerse={openVerse} />
        ) : null}
        {activeTab === 'highlights' ? (
          <HighlightListCard items={highlightItems} onOpenMushaf={openMushaf} onOpenVerse={openVerse} />
        ) : null}
        {activeTab === 'notes' ? (
          <NoteListCard items={noteItems} onEditNote={editNote} onOpenMushaf={openMushaf} onOpenVerse={openVerse} />
        ) : null}
        {activeTab === 'khatma' ? (
          <KhatmaSummaryCard
            active={khatmaSummary.active}
            dayIndex={khatmaSummary.active ? khatmaSummary.dayIndex : undefined}
            durationDays={khatmaSummary.active ? khatmaSummary.durationDays : undefined}
            onPress={() => router.push('/khatma' as Href)}
            pagesLoggedToday={khatmaSummary.active ? khatmaSummary.pagesLoggedToday : undefined}
            todayTarget={khatmaSummary.active ? khatmaSummary.todayTarget : undefined}
          />
        ) : null}
      </ScrollView>
    </SectionScreen>
  );
}
