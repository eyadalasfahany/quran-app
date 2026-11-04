'use no memo';
// Widget trees are built by calling these functions directly, not rendered as React components, so the React Compiler
// must not memoise them: its useMemoCache hook throws "Invalid hook call" outside a render (the wide widget never drew).

import { label } from './primitives';
import { card } from './card';
import { openPath, type WidgetContext } from './context';
import { WIDGET_FONTS } from './fonts';
import { prayerName, prayerRemaining, prayerTime } from './prayer-text';
import { prayerSmallBody } from './prayer-dots';
import { prayerStateAt } from '../snapshot/select';
import { widgetPaths } from '../snapshot/deep-links';

/**
 * The 2×2 next-prayer widget (AndroidWidgets frame, top left). Compact Taybah card: header, display name, time chip,
 * five prayer dots and a brandSurface remaining band (ADR 0035 §4; amended 3 Nov 2026 — static remaining, no Chronometer).
 * A missing or stale time is never drawn (ADR 0035 §1.8).
 */
export function NextPrayerWidget(ctx: WidgetContext) {
  const { labels, palette, rtl } = ctx;
  const { prayer } = ctx.snapshot;
  const state = prayerStateAt(prayer, ctx.now.getTime());
  const click = openPath(ctx, widgetPaths.prayer);

  if (state.kind === 'next') {
    const name = prayerName(ctx, state.key);
    const time = prayerTime(ctx, state.at);
    const remaining = prayerRemaining(ctx, state.at);
    return card(ctx, [prayerSmallBody(ctx, { header: labels.nextPrayer, name, nextKey: state.key, remaining, time })], {
      accessibilityLabel: `${labels.nextPrayer}: ${name} ${time}, ${labels.remaining} ${remaining}`,
      click,
    });
  }

  const message = state.kind === 'noLocation' ? labels.noLocation : labels.stale;
  return card(ctx, [
    label(labels.nextPrayer, { color: palette.onBrandSurfaceMuted, font: WIDGET_FONTS.medium, size: 12 }, rtl),
    label(message, { color: palette.onBrandSurface, font: WIDGET_FONTS.regular, maxLines: 3, size: 14 }, rtl),
  ], { accessibilityLabel: `${labels.nextPrayer}: ${message}`, click });
}
