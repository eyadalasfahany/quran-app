import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useLocale } from '@/core/i18n';
import { formatNumber } from '@/core/i18n/numbers';
import { useAzkarAvailable, useSessionCategoryProgress } from '@/features/azkar/data';

import type { SelectedAzkarItem } from '../components/SelectedAzkarSection';

/**
 * «أذكار مختارة» on Home: the session categories with today's progress (ADR 0034 §2). Nothing without Azkar content.
 */
export function useSelectedAzkarItems(): SelectedAzkarItem[] {
  const { t } = useTranslation();
  const locale = useLocale();
  const azkarAvailable = useAzkarAvailable();
  const sessions = useSessionCategoryProgress(locale);

  return useMemo(() => {
    if (!azkarAvailable) {
      return [];
    }
    return sessions.map((session) => ({
      fraction: session.total === 0 ? 0 : session.done ? 1 : session.completed / session.total,
      id: session.id,
      progressText: session.done
        ? t('home.dailyProgress.complete')
        : t('azkar.reader.progress', {
            current: formatNumber(session.completed, locale),
            total: formatNumber(session.total, locale),
          }),
      title: session.title,
    }));
  }, [azkarAvailable, locale, sessions, t]);
}
