'use no memo';
// Widget trees are built by calling these functions directly, not rendered as React components, so the React Compiler
// must not memoise them: its useMemoCache hook throws "Invalid hook call" outside a render (the wide widget never drew).

import { label } from './primitives';
import { card } from './card';
import type { WidgetContext } from './context';
import { WIDGET_FONTS } from './fonts';

/**
 * The state every widget shows before the app has written a snapshot, or when it cannot be read (ADR 0035 §1.8). A tap
 * opens the app, which writes the snapshot on launch.
 */
export function OpenAppWidget(ctx: WidgetContext) {
  const { labels, palette, rtl } = ctx;
  return card(ctx, [
    label(labels.openApp, { color: palette.ink, font: WIDGET_FONTS.medium, maxLines: 3, size: 14 }, rtl),
  ], { accessibilityLabel: labels.openApp, click: { clickAction: 'OPEN_APP' } });
}
