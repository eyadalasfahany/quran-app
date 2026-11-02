import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useLocale } from '@/core/i18n/useLocale';

import { findNextConjunction, findPreviousConjunction } from '../data/conjunction';
import { formatConjunctionPreview } from '../data/format';
import { useMoonLocation } from './useMoonLocation';

/**
 * Live Menu card line for moon sighting (#MenuNewCards): the conjunction relative to `now`. Without a Salah location
 * the card asks for one, as the sighting screen does.
 */
export function useMoonMenuPreview(now: Date = new Date()): string {
  const { t } = useTranslation();
  const locale = useLocale();
  const { snapshot } = useMoonLocation();
  const hasLocation = snapshot?.coords !== undefined;

  return useMemo(() => {
    if (!hasLocation) {
      return t('moon.menu.noLocation');
    }
    return formatConjunctionPreview(now, findPreviousConjunction(now), findNextConjunction(now), locale, t);
  }, [hasLocation, locale, now, t]);
}
