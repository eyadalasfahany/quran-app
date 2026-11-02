import { useTranslation } from 'react-i18next';

import { useLocale } from '@/core/i18n';
import { useAzkarAvailable, useSessionCategoryProgress } from '@/features/azkar/data';
import { useDailyGoals } from '@/features/daily-goals/hooks/useDailyGoals';
import { useSibhaTodayTotal } from '@/features/sibha/data/store';

import { buildDailyProgress } from '../data/daily-progress';
import { dailyProgressLines, type DailyProgressLine } from '../data/daily-progress-lines';

import { useHomeWird } from './useHomeWird';

export type { DailyProgressLine } from '../data/daily-progress-lines';

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

  return {
    lines: dailyProgressLines(progress, sessions, t, locale),
    percent: progress.percent,
  };
}
