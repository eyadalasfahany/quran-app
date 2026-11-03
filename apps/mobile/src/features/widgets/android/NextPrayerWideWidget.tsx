'use no memo';
// Widget trees are built by calling these functions directly, not rendered as React components, so the React Compiler
// must not memoise them: its useMemoCache hook throws "Invalid hook call" outside a render (the wide widget never drew).

import { FlexWidget } from 'react-native-android-widget';

import { card } from './card';
import { withAlpha } from './theme';
import { openPath, type WidgetContext } from './context';
import { WIDGET_FONTS } from './fonts';
import { block, column, label, row } from './primitives';
import { prayerName, prayerRemaining, prayerTime } from './prayer-text';
import {
  ON_BRAND_WASH_ALPHA,
  ON_BRAND_WASH_ALPHA_LIGHT,
  onBrandChip,
  onBrandSoftBand,
  widgetFaceColumn,
} from './widget-chrome';
import { widgetPaths } from '../snapshot/deep-links';
import { prayerStateAt } from '../snapshot/select';
import type { PrayerEntry } from '../snapshot/types';

/** The day's entries: those on the local date of `now`, in time order. */
function todaysEntries(entries: readonly PrayerEntry[], now: Date): PrayerEntry[] {
  const today = now.toDateString();
  return entries.filter((entry) => new Date(entry.at).toDateString() === today);
}

/**
 * The 4×2 next-prayer widget (AndroidWidgets frame, the wide card): header, time chip, five prayer tiles with a strong
 * next highlight, and a soft onBrand remaining band. Times come from the snapshot only.
 */
export function NextPrayerWideWidget(ctx: WidgetContext) {
  const { labels, palette, rtl } = ctx;
  const { prayer } = ctx.snapshot;
  const state = prayerStateAt(prayer, ctx.now.getTime());
  const click = openPath(ctx, widgetPaths.prayer);

  if (state.kind !== 'next') {
    const message = state.kind === 'noLocation' ? labels.noLocation : labels.stale;
    return card(ctx, [
      label(labels.nextPrayer, { color: palette.onBrandSurfaceMuted, font: WIDGET_FONTS.medium, size: 12 }, rtl),
      label(message, { color: palette.onBrandSurface, font: WIDGET_FONTS.regular, maxLines: 2, size: 15 }, rtl),
    ], { accessibilityLabel: `${labels.nextPrayer}: ${message}`, click });
  }

  const name = prayerName(ctx, state.key);
  const time = prayerTime(ctx, state.at);
  const remaining = prayerRemaining(ctx, state.at);
  const place = prayer.place === null ? '' : ` · ${prayer.place}`;
  const tiles = todaysEntries(prayer.entries, ctx.now).map((entry) => {
    const isNext = entry.key === state.key && entry.at === state.at;
    const washStrong = withAlpha(palette.onBrandSurface, ON_BRAND_WASH_ALPHA);
    const washLight = withAlpha(palette.onBrandSurface, ON_BRAND_WASH_ALPHA_LIGHT);
    const color = isNext ? palette.onBrandSurface : palette.onBrandSurfaceMuted;
    return (
      <FlexWidget
        key={entry.key}
        style={{
          backgroundColor: isNext ? washStrong : washLight,
          borderColor: isNext ? withAlpha(palette.gold, 0.85) : withAlpha(palette.onBrandSurface, 0),
          borderRadius: 12,
          borderWidth: isNext ? 1.5 : 0,
          flex: 1,
          flexDirection: 'column',
          paddingHorizontal: 2,
          paddingVertical: 6,
        }}
      >
        {label(prayerName(ctx, entry.key), { align: 'center', color, font: isNext ? WIDGET_FONTS.bold : WIDGET_FONTS.medium, size: 12 }, rtl)}
        {label(prayerTime(ctx, entry.at), { align: 'center', color, font: isNext ? WIDGET_FONTS.semiBold : WIDGET_FONTS.regular, size: 13 }, rtl)}
      </FlexWidget>
    );
  });

  return card(ctx, [
    widgetFaceColumn([
      column([
        label(`${labels.nextPrayer}${place}`, { color: palette.onBrandSurfaceMuted, font: WIDGET_FONTS.medium, size: 12 }, rtl),
        block({ height: 4 }),
        label(name, { color: palette.onBrandSurface, font: WIDGET_FONTS.display, size: 32 }, rtl),
        block({ height: 6 }),
        onBrandChip(ctx, time),
      ]),
      row(tiles, rtl, { flexGap: 4 }),
      onBrandSoftBand(ctx, labels.remaining, remaining),
    ]),
  ], { accessibilityLabel: `${labels.nextPrayer}: ${name} ${time}, ${labels.remaining} ${remaining}`, click });
}
