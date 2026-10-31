import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { formatNumber, useLocale } from '@/core/i18n';
import { useContinueAzkar } from '@/features/azkar/data';

export type AzkarMenuPreview = {
  caption: string;
  title: string;
  preview: string;
  /** 0 to 1 while a scope is in progress; undefined draws no bar. */
  progress?: number;
};

/**
 * The menu's Azkar card, as Azkar home's «تابع» card resolves it: the scope in progress with its count and bar, or
 * the subtitle when nothing is in progress. The caller mounts it only when Azkar content is installed, because
 * `useContinueAzkar` reads the content database.
 */
export function useAzkarMenuPreview(): AzkarMenuPreview {
  const { t } = useTranslation();
  const locale = useLocale();
  const continueAzkar = useContinueAzkar(locale);

  return useMemo((): AzkarMenuPreview => {
    if (continueAzkar === null) {
      return { caption: t('menu.azkar.caption'), title: t('menu.azkar.title'), preview: t('menu.azkar.subtitle') };
    }
    const { scope, completed } = continueAzkar;
    const title = scope.categoryId
      ? t(`azkar.categories.${scope.categoryId}` as never)
      : scope.occasion
        ? t(`azkar.occasions.${scope.occasion}` as never)
        : t('azkar.reader.entryTitle');
    const shown = Math.min(completed, scope.total);
    return {
      caption: t('menu.azkar.continueCaption'),
      title,
      preview: t('menu.azkar.progress', { current: formatNumber(shown, locale), total: formatNumber(scope.total, locale) }),
      progress: scope.total === 0 ? 0 : shown / scope.total,
    };
  }, [continueAzkar, locale, t]);
}
