import type { Href } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { formatNumber, useLocale } from '@/core/i18n';
import { useAzkarAvailable, useContinueAzkar } from '@/features/azkar/data';
import { azkarHref } from '@/features/azkar/routes';

export type MenuResume = {
  caption: string;
  title: string;
  preview: string;
  /** 0 to 1; undefined draws no bar. */
  progress?: number;
  href: Href;
};

export type AzkarMenuState = {
  /** Whether Azkar content is installed (ADR 0031 §10). Gates the Azkar cards and Favourites. */
  available: boolean;
  /** The scope to continue, opened in the reader at its first incomplete unit. Null when nothing is in progress. */
  resume: MenuResume | null;
};

/**
 * The menu's Azkar state. `resume` is the «تابع الأذكار» card: the last active scope with its count and bar, opened in
 * the Azkar reader, which resumes at the first incomplete unit. `useContinueAzkar` reads the content database; under
 * Jest that is mocked where a screen mounts this hook.
 */
export function useAzkarMenuPreview(): AzkarMenuState {
  const { t } = useTranslation();
  const locale = useLocale();
  const available = useAzkarAvailable();
  const continueAzkar = useContinueAzkar(locale);

  return useMemo((): AzkarMenuState => {
    if (!available || continueAzkar === null) {
      return { available, resume: null };
    }
    const { scope, completed } = continueAzkar;
    const title = scope.categoryId
      ? t(`azkar.categories.${scope.categoryId}` as never)
      : scope.occasion
        ? t(`azkar.occasions.${scope.occasion}` as never)
        : t('azkar.reader.entryTitle');
    const shown = Math.min(completed, scope.total);
    const href = scope.categoryId
      ? azkarHref.read(scope.categoryId)
      : scope.entryKey
        ? azkarHref.entry(scope.entryKey)
        : azkarHref.home;
    return {
      available,
      resume: {
        caption: t('menu.continueAzkar.caption'),
        title,
        preview: t('menu.azkar.progress', { current: formatNumber(shown, locale), total: formatNumber(scope.total, locale) }),
        progress: scope.total === 0 ? 0 : shown / scope.total,
        href,
      },
    };
  }, [available, continueAzkar, locale, t]);
}
