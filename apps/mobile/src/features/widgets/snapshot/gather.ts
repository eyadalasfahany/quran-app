import type { TFunction } from 'i18next';
import { Appearance } from 'react-native';

import { openContentDb } from '@/core/db/content/open';
import type { SqlExecutor } from '@/core/db/sql-executor';
import { i18n } from '@/core/i18n/i18n';
import { getLocale, type Locale } from '@/core/i18n/locale';
import { buildDailyProgress } from '@/features/home/data/daily-progress';
import { dailyProgressLines, type ProgressSession } from '@/features/home/data/daily-progress-lines';
import { homeWirdFor, type HomeWird } from '@/features/home/data/home-wird';
import { hasAzkarContent, listCategories } from '@/features/azkar/data/content-repository';
import { categoryPeriodProgress } from '@/features/azkar/data/category-progress';
import { azkarProgressSummaries } from '@/features/azkar/data/progress-summary-store';
import { readDailyGoals } from '@/features/daily-goals/data/goals';
import { getActivePlan, listLogsForPlan } from '@/features/khatma/data/repository';
import { toLocalDateString } from '@/features/khatma/data/plan';
import { getChapter } from '@/features/reader/data/chapters';
import { resolveInitialAnchor } from '@/features/reader/anchor/reading-anchor';
import { getVerseByKey } from '@/features/reader/data/verses';
import { loadPrayerLocation } from '@/features/salah/data/location-cache';
import { DEFAULT_SIBHA_STATE, type SibhaState } from '@/features/sibha/data/model';
import { readSibhaState, readSibhaTodayTotal } from '@/features/sibha/data/store';

import { buildWidgetLabels } from './labels';
import { buildWidgetSnapshot } from './build-snapshot';
import { prayerTimelineFor } from './prayer-entries';
import { readWidgetSnapshot } from './store';
import type { WidgetAzkar, WidgetReading, WidgetSnapshot } from './types';
import { isAfterMaghrib, resolveWidgetColorMode } from './widget-color-mode';

/** One safe read: a failure (a database not yet migrated, a missing row) gives the fallback, never an exception. */
function safely<T>(fallback: T, read: () => T): T {
  try {
    return read();
  } catch {
    return fallback;
  }
}

/** The content database, or null while it is not open (the sync waits for it, but a read must not throw). */
function contentExecutor(): SqlExecutor | null {
  return safely<SqlExecutor | null>(null, () => openContentDb().executor);
}

function readReading(executor: SqlExecutor | null): WidgetReading | null {
  if (executor === null) {
    return null;
  }
  return safely<WidgetReading | null>(null, () => {
    const verse = getVerseByKey(executor, resolveInitialAnchor().verseKey);
    const chapter = verse === undefined ? undefined : getChapter(executor, verse.chapterId);
    if (verse === undefined || chapter === undefined) {
      return null;
    }
    return { ayah: verse.verseNumber, page: verse.page, surah: chapter.nameArabic, verseKey: verse.verseKey };
  });
}

function readWird(executor: SqlExecutor | null, now: Date): HomeWird | null {
  if (executor === null) {
    return null;
  }
  return safely<HomeWird | null>(null, () => {
    const plan = getActivePlan();
    if (plan === null) {
      return null;
    }
    return homeWirdFor({
      executor,
      logs: listLogsForPlan(plan.id),
      plan,
      today: toLocalDateString(now),
    });
  });
}

/** Every session category with its progress in the current period, titled in `locale` (the same data as Home's). */
function readSessions(executor: SqlExecutor, locale: Locale, now: Date, t: TFunction): ProgressSession[] {
  return safely<ProgressSession[]>([], () => {
    const summaries = azkarProgressSummaries.getSnapshot();
    return listCategories(executor, locale)
      .filter((category) => category.kind === 'session')
      .map((category) => ({
        id: category.id,
        title: t(`azkar.categories.${category.id}` as never),
        ...categoryPeriodProgress(category, summaries, now),
      }));
  });
}

/**
 * Builds the widget snapshot from local data, in the app runtime. It reads the same sources as Home and the prayer
 * screen, through their pure functions, so a widget shows what the app shows. It never calls the network. A source that
 * fails leaves its block empty; the rest is still written.
 */
export async function gatherWidgetSnapshot(now: Date = new Date()): Promise<WidgetSnapshot> {
  const locale = getLocale();
  const t = i18n.getFixedT(locale);
  const location = await loadPrayerLocation().catch(() => null);
  const coords = location?.coords ?? null;
  const timeline = prayerTimelineFor(now, coords);
  const place = location?.cityName?.[locale] ?? null;

  const executor = contentExecutor();
  const wird = readWird(executor, now);
  const azkarAvailable = executor !== null && safely(false, () => hasAzkarContent(executor));
  const sessions = azkarAvailable ? readSessions(executor, locale, now, t) : [];
  const misbahaToday = safely(0, () => readSibhaTodayTotal(now));
  const state = safely<SibhaState>(DEFAULT_SIBHA_STATE, () => readSibhaState());
  const previousSnapshot = safely<WidgetSnapshot | null>(null, () => readWidgetSnapshot());
  const widgetTapsTotal = previousSnapshot?.misbaha.widgetTapsTotal;

  const progress = buildDailyProgress({
    goals: readDailyGoals(),
    misbahaToday,
    sessions: sessions.map(({ id, completed, total, done }) => ({ completed, done, id, total })),
    wird: wird === null ? null : { pagesToday: wird.pagesToday, todayTarget: wird.todayTarget },
  });
  const azkar: WidgetAzkar = azkarAvailable
    ? {
        sessions: sessions.map((session) => ({
          complete: session.done,
          done: session.completed,
          id: session.id,
          title: session.title,
          total: session.total,
        })),
      }
    : null;

  const colorMode = resolveWidgetColorMode({
    afterMaghrib: isAfterMaghrib(timeline.entries, now.getTime()),
    colorScheme: Appearance.getColorScheme(),
  });

  return buildWidgetSnapshot({
    azkar,
    colorMode,
    labels: buildWidgetLabels(t),
    locale,
    misbaha: {
      count: state.count,
      target: state.target,
      todayTotal: misbahaToday,
      ...(widgetTapsTotal === undefined ? {} : { widgetTapsTotal }),
    },
    now: now.getTime(),
    prayer: { entries: timeline.entries, place, validUntil: timeline.validUntil },
    progress: {
      percent: progress.percent,
      rows: dailyProgressLines(progress, sessions, t, locale).map((line) => ({ ...line })),
    },
    reading: readReading(executor),
    wird: wird === null ? null : { done: wird.pagesToday, target: wird.todayTarget },
  });
}
