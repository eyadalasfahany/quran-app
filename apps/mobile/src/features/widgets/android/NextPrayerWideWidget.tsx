'use no memo';
// Widget trees are built by calling these functions directly, not rendered as React components, so the React Compiler
// must not memoise them: its useMemoCache hook throws "Invalid hook call" outside a render (the wide widget never drew).

import { FlexWidget } from 'react-native-android-widget';

import { card } from './card';
import { withAlpha } from './theme';
import { openPath, type WidgetContext } from './context';
import { WIDGET_FONTS } from './fonts';
import { label, row, spacer } from './primitives';
import { prayerName, prayerTime } from './prayer-text';
import { widgetPaths } from '../snapshot/deep-links';
import { prayerStateAt } from '../snapshot/select';
import type { PrayerEntry } from '../snapshot/types';

/** The day's entries: those on the local date of `now`, in time order. */
function todaysEntries(entries: readonly PrayerEntry[], now: Date): PrayerEntry[] {
  const today = now.toDateString();
  return entries.filter((entry) => new Date(entry.at).toDateString() === today);
}

/**
 * The 4×2 next-prayer widget (AndroidWidgets frame, the wide card): the next prayer and time, then the day's five times
 * with the next one shaded. The times come from the snapshot, never from a second calculation.
 */
export function NextPrayerWideWidget(ctx: WidgetContext) {
  const { labels, palette, rtl } = ctx;
  const { prayer } = ctx.snapshot;
  const state = prayerStateAt(prayer, ctx.now.getTime());
  const click = openPath(ctx, widgetPaths.prayer);

  if (state.kind !== 'next') {
    const message = state.kind === 'noLocation' ? labels.noLocation : labels.stale;
    return card(ctx, [
      label(labels.nextPrayer, { color: palette.inkMuted, font: WIDGET_FONTS.medium, size: 12 }, rtl),
      label(message, { color: palette.ink, font: WIDGET_FONTS.regular, maxLines: 2, size: 15 }, rtl),
    ], { accessibilityLabel: `${labels.nextPrayer}: ${message}`, click });
  }

  const name = prayerName(ctx, state.key);
  const time = prayerTime(ctx, state.at);
  const place = prayer.place === null ? '' : ` · ${prayer.place}`;
  const tiles = todaysEntries(prayer.entries, ctx.now).map((entry) => {
    const isNext = entry.key === state.key && entry.at === state.at;
    const color = isNext ? palette.ink : palette.inkMuted;
    return (
      <FlexWidget
        style={{
          backgroundColor: isNext ? palette.highlightActive : withAlpha(palette.surfaceRaised, 0),
          borderRadius: 12,
          flex: 1,
          flexDirection: 'column',
          paddingVertical: 4,
        }}
        key={entry.key}
      >
        {label(prayerName(ctx, entry.key), { align: 'center', color, font: isNext ? WIDGET_FONTS.bold : WIDGET_FONTS.medium, size: 12 }, rtl)}
        {label(prayerTime(ctx, entry.at), { align: 'center', color, font: WIDGET_FONTS.regular, size: 13 }, rtl)}
      </FlexWidget>
    );
  });

  return card(ctx, [
    row(
      [
        <FlexWidget key="info" style={{ flex: 1, flexDirection: 'column' }}>
          {label(`${labels.nextPrayer}${place}`, { color: palette.inkMuted, font: WIDGET_FONTS.medium, size: 12 }, rtl)}
          {label(name, { color: palette.ink, font: WIDGET_FONTS.display, size: 30 }, rtl)}
        </FlexWidget>,
        spacer(),
        label(time, { color: palette.brand, font: WIDGET_FONTS.bold, inline: true, size: 28 }, rtl),
      ],
      rtl,
    ),
    spacer(),
    row(tiles, rtl, { flexGap: 2 }),
  ], { accessibilityLabel: `${labels.nextPrayer}: ${name} ${time}`, click });
}
