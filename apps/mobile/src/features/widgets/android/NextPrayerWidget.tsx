'use no memo';
// Widget trees are built by calling these functions directly, not rendered as React components, so the React Compiler
// must not memoise them: its useMemoCache hook throws "Invalid hook call" outside a render (the wide widget never drew).

import { label, spacer } from './primitives';
import { card } from './card';
import { openPath, type WidgetContext } from './context';
import { WIDGET_FONTS } from './fonts';
import { prayerName, prayerTime } from './prayer-text';
import { prayerStateAt } from '../snapshot/select';
import { widgetPaths } from '../snapshot/deep-links';

/**
 * The 2×2 next-prayer widget (AndroidWidgets frame, top left). The time only, no countdown (ADR 0035 decision 4): a
 * countdown on Android would need a native chronometer. A missing or stale time is never drawn (ADR 0035 §1.8).
 */
export function NextPrayerWidget(ctx: WidgetContext) {
  const { labels, palette, rtl } = ctx;
  const { prayer } = ctx.snapshot;
  const state = prayerStateAt(prayer, ctx.now.getTime());
  const click = openPath(ctx, widgetPaths.prayer);

  if (state.kind === 'next') {
    const name = prayerName(ctx, state.key);
    const time = prayerTime(ctx, state.at);
    return card(ctx, [
      label(labels.nextPrayer, { color: palette.inkMuted, font: WIDGET_FONTS.medium, size: 12 }, rtl),
      label(name, { color: palette.ink, font: WIDGET_FONTS.display, size: 32 }, rtl),
      label(time, { color: palette.brand, font: WIDGET_FONTS.bold, size: 26 }, rtl),
      spacer(),
      prayer.place === null
        ? null
        : label(prayer.place, { color: palette.inkMuted, font: WIDGET_FONTS.regular, size: 12 }, rtl),
    ], { accessibilityLabel: `${labels.nextPrayer}: ${name} ${time}`, click });
  }

  const message = state.kind === 'noLocation' ? labels.noLocation : labels.stale;
  return card(ctx, [
    label(labels.nextPrayer, { color: palette.inkMuted, font: WIDGET_FONTS.medium, size: 12 }, rtl),
    label(message, { color: palette.ink, font: WIDGET_FONTS.regular, maxLines: 3, size: 14 }, rtl),
  ], { accessibilityLabel: `${labels.nextPrayer}: ${message}`, click });
}
