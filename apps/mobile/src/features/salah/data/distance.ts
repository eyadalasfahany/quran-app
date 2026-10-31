import { arabizeDigits } from '@/core/i18n/numbers';
import type { Locale } from '@/core/i18n/locale';

// Al-Masjid al-Haram, per the step brief.
const MAKKAH = { lat: 21.4225, lng: 39.8262 } as const;
const EARTH_RADIUS_KM = 6371;

// U+066C ARABIC THOUSANDS SEPARATOR («١٬٢٤٥»).
const ARABIC_THOUSANDS_SEPARATOR = '٬';

/** Great-circle (haversine) distance to al-Masjid al-Haram, in whole kilometers. */
export function distanceToMakkah(coords: { lat: number; lng: number }): number {
  const toRadians = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRadians(MAKKAH.lat - coords.lat);
  const dLng = toRadians(MAKKAH.lng - coords.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coords.lat)) * Math.cos(toRadians(MAKKAH.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(EARTH_RADIUS_KM * c);
}

/** 1245 → "1,245" in English, «١٬٢٤٥» in Arabic (Arabic-Indic digits, U+066C separator). */
export function formatKilometers(km: number, locale: Locale): string {
  const grouped = String(km).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (locale !== 'ar') {
    return grouped;
  }
  return arabizeDigits(grouped).replaceAll(',', ARABIC_THOUSANDS_SEPARATOR);
}
