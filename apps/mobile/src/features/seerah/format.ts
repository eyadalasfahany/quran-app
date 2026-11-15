import type { TFunction } from 'i18next';

import { formatNumber, i18n, type Locale } from '@/core/i18n';

import { eraOfAge, stageOfAge } from './logic';

/** «عمره ٥٤ سنة» / "Age 54". */
// Numbers follow the interface language now showing (the same source `useLocale` reads), not the saved choice.
function num(value: number): string {
  const locale: Locale = i18n.language === 'en' ? 'en' : 'ar';
  return formatNumber(value, locale);
}

export function ageText(t: TFunction, age: number): string {
  return t('seerah.age.label', { age: num(age) });
}

/** «عمره ٥٤» / "Age 54": the map label's age line, without the unit (frame SeerahMapRegion). */
export function ageShortText(t: TFunction, age: number): string {
  return t('seerah.age.short', { age: num(age) });
}

/** «عمره ٤٣–٤٤ سنة» for a range, the single age when both ends are equal. */
export function ageRangeText(t: TFunction, from: number, to: number): string {
  return from === to ? ageText(t, from) : t('seerah.age.range', { from: num(from), to: num(to) });
}

/** The Hijri detail of an age, «٢ هـ» or «١٣ ق.هـ»; null outside 0..63. Shown small on the event page only. */
export function eraText(t: TFunction, age: number): string | null {
  const era = eraOfAge(age);
  return era === null ? null : t(`seerah.era.${era.era}`, { year: num(era.year) });
}

/** «٥ أحداث», «حدثان», «١٦٢ حدثًا»: the plural form follows the count. */
export function eventCountText(t: TFunction, count: number): string {
  return t('seerah.eventCount', { count, formatted: num(count) });
}

export function stageName(t: TFunction, age: number): string | null {
  const stage = stageOfAge(age);
  return stage === null ? null : t(`seerah.stages.${stage.key}`);
}

/** «٤٠–٦٣» */
export function stageRangeShort(t: TFunction, from: number, to: number): string {
  return t('seerah.stageRangeShort', { from: num(from), to: num(to) });
}

/** «من ٤٠ إلى ٦٣ سنة» */
export function stageRangeText(t: TFunction, from: number, to: number): string {
  return t('seerah.stageRange', { from: num(from), to: num(to) });
}
