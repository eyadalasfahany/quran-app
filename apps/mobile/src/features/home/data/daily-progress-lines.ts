import type { TFunction } from 'i18next';

import type { Locale } from '@/core/i18n/locale';
import { formatNumber } from '@/core/i18n/numbers';

import type { DailyProgress } from './daily-progress';

/** One row of Home's progress card, worded: its label, its value and whether it is done. */
export type DailyProgressLine = {
  key: string;
  label: string;
  value: string;
  done: boolean;
};

/** An Azkar session category with its progress in the current period, and its title in the app language. */
export type ProgressSession = {
  id: string;
  title: string;
  completed: number;
  total: number;
  done: boolean;
};

/**
 * Words the progress rows for the app language. Home's card and the home-screen widgets share it, so both show the
 * same labels and numbers. Pure: no hooks, no storage.
 */
export function dailyProgressLines(
  progress: DailyProgress,
  sessions: readonly ProgressSession[],
  t: TFunction,
  locale: Locale,
): DailyProgressLine[] {
  return progress.rows.map((row): DailyProgressLine => {
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
}
