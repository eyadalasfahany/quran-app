import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useHijriAdjustment } from '@/features/hijri/data/adjustment';

import { buildMoonEvening } from '../data/evening';
import { useMoonLocation } from './useMoonLocation';

/** Live Menu card line for moon sighting (#MenuNewCards). */
export function useMoonMenuPreview(now: Date = new Date()): string {
  const { t } = useTranslation();
  const [adjust] = useHijriAdjustment();
  const { snapshot } = useMoonLocation();

  return useMemo(() => {
    const coords = snapshot?.coords;
    if (!coords) {
      return t('moon.menu.caption');
    }
    const ctx = buildMoonEvening(now, coords.lat, coords.lng, adjust);
    if (ctx?.estimate) {
      return t(`moon.zones.${ctx.estimate.odehZone.toLowerCase() as 'a'}`);
    }
    return t('moon.unavailable');
  }, [adjust, now, snapshot, t]);
}
