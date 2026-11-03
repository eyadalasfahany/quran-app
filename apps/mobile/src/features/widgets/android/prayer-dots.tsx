'use no memo';

import { FlexWidget } from 'react-native-android-widget';
import type { ReactNode } from 'react';

import { block, column, label, row } from './primitives';
import { WIDGET_FONTS } from './fonts';
import { withAlpha, type WidgetPalette } from './theme';
import { brandSurfaceBand, fillChip, widgetFaceColumn } from './widget-chrome';
import type { WidgetContext } from './context';
import type { PrayerEntry, PrayerKey } from '../snapshot/types';

/** Today's five prayers in display order (fajr → isha). */
export const PRAYER_DOT_ORDER: readonly PrayerKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

const DOT_SIZE = 8;

export type PrayerDotState = 'past' | 'next' | 'future';

export function prayerDotState(
  key: PrayerKey,
  nextKey: PrayerKey,
  entryAt: number | undefined,
  nowMs: number,
): PrayerDotState {
  if (key === nextKey) {
    return 'next';
  }
  if (entryAt !== undefined && entryAt < nowMs) {
    return 'past';
  }
  return 'future';
}

function todaysEntries(entries: readonly PrayerEntry[], now: Date): PrayerEntry[] {
  const today = now.toDateString();
  return entries.filter((entry) => new Date(entry.at).toDateString() === today);
}

function prayerDot(palette: WidgetPalette, state: PrayerDotState, key: PrayerKey) {
  const round = DOT_SIZE / 2;
  if (state === 'next') {
    return (
      <FlexWidget
        key={key}
        style={{ backgroundColor: palette.brand, borderRadius: round, height: DOT_SIZE, width: DOT_SIZE }}
      />
    );
  }
  if (state === 'past') {
    return (
      <FlexWidget
        key={key}
        style={{
          backgroundColor: withAlpha(palette.brand, 0.35),
          borderRadius: round,
          height: DOT_SIZE,
          width: DOT_SIZE,
        }}
      />
    );
  }
  return (
    <FlexWidget
      key={key}
      style={{
        backgroundColor: withAlpha(palette.fillSecondary, 0),
        borderColor: palette.line,
        borderRadius: round,
        borderWidth: 1,
        height: DOT_SIZE,
        width: DOT_SIZE,
      }}
    />
  );
}

/** Five prayer dots for today's cycle; the next prayer is a filled brand circle. */
export function prayerDots(ctx: WidgetContext, nextKey: PrayerKey): ReactNode {
  const { palette, rtl, now } = ctx;
  const nowMs = now.getTime();
  const byKey = new Map(todaysEntries(ctx.snapshot.prayer.entries, now).map((entry) => [entry.key, entry.at]));
  const dots = PRAYER_DOT_ORDER.map((key) =>
    prayerDot(palette, prayerDotState(key, nextKey, byKey.get(key), nowMs), key),
  );
  return row(dots, rtl, { flexGap: 6, paddingVertical: 4, width: 'match_parent' });
}

/** Pill behind the prayer clock (semibold ink, not muted). */
export function prayerTimeChip(ctx: WidgetContext, time: string): ReactNode {
  return fillChip(ctx, time);
}

/** Header, display name and time chip with a tight gap under the header. */
export function prayerSmallTop(ctx: WidgetContext, header: string, name: string, time: string): ReactNode {
  const { palette, rtl } = ctx;
  return column(
    [
      label(header, { color: palette.inkMuted, font: WIDGET_FONTS.medium, size: 12 }, rtl),
      block({ height: 6 }),
      label(name, { color: palette.ink, font: WIDGET_FONTS.display, size: 35 }, rtl),
      block({ height: 8 }),
      prayerTimeChip(ctx, time),
    ],
    { alignItems: rtl ? 'flex-end' : 'flex-start', width: 'match_parent' },
  );
}

/** Card body column: top stack, prayer dots and remaining band distributed with space-between. */
export function prayerSmallBody(
  ctx: WidgetContext,
  options: { header: string; name: string; nextKey: PrayerKey; time: string; remaining: string },
): ReactNode {
  const { labels } = ctx;
  return widgetFaceColumn([
    prayerSmallTop(ctx, options.header, options.name, options.time),
    prayerDots(ctx, options.nextKey),
    brandSurfaceBand(ctx, labels.remaining, options.remaining),
  ]);
}
