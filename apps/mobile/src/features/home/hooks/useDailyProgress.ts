import { useTranslation } from 'react-i18next';

import { formatNumber, useLocale } from '@/core/i18n';
import { useAzkarAvailable, useSessionCategoryProgress } from '@/features/azkar/data';
import { useDailyGoals } from '@/features/daily-goals/hooks/useDailyGoals';
import { useSibhaTodayTotal } from '@/features/sibha/data/store';

import { buildDailyProgress } from '../data/daily-progress';

import { useHomeWird } from './useHomeWird';

/** One row of Home's progress card, worded: its label, its value and whether it is done. */
export type DailyProgressLine = {
  key: string;
  label: string;
  value: string;
  done: boolean;
};

/**
 * Today's progress for Home (ADR 0034 §5): the ring's percent and one line per chosen goal. The wird comes from the
 * Khatma plan, the sessions from the Azkar progress, and the misbaha from today's taps. Azkar goals need Azkar content.
 */
export function useDailyProgress(): { percent: number; lines: DailyProgressLine[] } {
  const { t } = useTranslation();
  const locale = useLocale();
  const { goals } = useDailyGoals();
  const azkarAvailable = useAzkarAvailable();
  const sessions = useSessionCategoryProgress(locale);
  const wird = useHomeWird();
  const misbahaToday = useSibhaTodayTotal();

  const progress = buildDailyProgress({
    goals,
    misbahaToday,
    sessions: azkarAvailable ? sessions : [],
    wird: wird === null ? null : { pagesToday: wird.pagesToday, todayTarget: wird.todayTarget },
  });

  const lines = progress.rows.map((row): DailyProgressLine => {
    const current = formatNumber(row.completed, locale);
    const total = formatNumber(row.total, locale);
    if (row.kind === 'wird') {
      return {
        done: row.done,
        key: row.key,
        label: t('home.dailyProgress.wird'),
        value: t('home.dailyProgress.pages', { current, total }),
      };
    }
    if (row.kind === 'session') {
      const session = sessions.find((item) => item.id === row.sessionId);
      return {
        done: row.done,
        key: row.key,
        label: session?.title ?? '',
        value: row.done ? t('home.dailyProgress.complete') : t('azkar.reader.progress', { current, total }),
      };
    }
    return {
      done: row.done,
      key: row.key,
      label: t('home.dailyProgress.misbaha'),
      value: t('azkar.reader.progress', { current, total }),
    };
  });

  return { lines, percent: progress.percent };
}
