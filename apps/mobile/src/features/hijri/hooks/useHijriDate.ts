import { useMemo } from 'react';

import { getLocale } from '@/core/i18n/locale';
import { formatHijriDate } from '@/core/i18n/dates';

import { useHijriAdjustment } from '../data/adjustment';

/**
 * The Hijri date for `now`, with the user's adjustment (ADR 0048, decision 2). The Salah header and every Hijri surface
 * read it through here, so one adjustment moves them all together.
 */
export function useHijriDate(now?: Date): string {
  const locale = getLocale();
  const [adjustDays] = useHijriAdjustment();
  return useMemo(() => formatHijriDate(now ?? new Date(), locale, adjustDays), [now, locale, adjustDays]);
}
