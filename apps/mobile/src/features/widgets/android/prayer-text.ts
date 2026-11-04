import { formatPlaybackClock, prayerClock } from '@/core/i18n/clock';

import type { PrayerKey } from '../snapshot/types';

import type { WidgetContext } from './context';

/** A prayer's name in the snapshot's language. */
export function prayerName(ctx: WidgetContext, key: PrayerKey): string {
  const labels = ctx.labels;
  switch (key) {
    case 'fajr':
      return labels.prayerFajr;
    case 'dhuhr':
      return labels.prayerDhuhr;
    case 'asr':
      return labels.prayerAsr;
    case 'maghrib':
      return labels.prayerMaghrib;
    case 'isha':
      return labels.prayerIsha;
  }
}

/** A prayer instant as the app writes it («٣:٤٧ م» in Arabic, the same formatter the app uses). */
export function prayerTime(ctx: WidgetContext, at: number): string {
  return prayerClock(new Date(at), ctx.locale);
}

/** Remaining time until `at`, static until the next widget refresh (ADR 0035 §4, amended 3 Nov 2026). */
export function prayerRemaining(ctx: WidgetContext, at: number): string {
  return formatPlaybackClock(at - ctx.now.getTime(), ctx.locale);
}
