import type { Locale } from '@/core/i18n/locale';

import type { AzkarRecording } from '../data/model';

export type AzkarAttribution = {
  /** The attribution line for the locale, or null when the recording has none. Never translated. */
  text: string | null;
  licence: string;
  licenceUrl: string | null;
};

function nonEmpty(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * The attribution line in the reader's locale. When the Arabic line is empty, the English line is used (and the
 * reverse in English). A line is never translated: a missing one stays missing.
 */
export function azkarAttribution(recording: AzkarRecording, locale: Locale): AzkarAttribution {
  const arabic = nonEmpty(recording.attributionAr);
  const english = nonEmpty(recording.attributionEn);
  const text = locale === 'ar' ? (arabic ?? english) : (english ?? arabic);

  return {
    text,
    licence: recording.licence,
    licenceUrl: nonEmpty(recording.licenceUrl),
  };
}
