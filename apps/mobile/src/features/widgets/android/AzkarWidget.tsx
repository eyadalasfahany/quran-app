'use no memo';
// Widget trees are built by calling these functions directly, not rendered as React components, so the React Compiler
// must not memoise them: its useMemoCache hook throws "Invalid hook call" outside a render (the wide widget never drew).

import { formatNumber } from '@/core/i18n/numbers';

import { card } from './card';
import { openPath, type WidgetContext } from './context';
import { WIDGET_FONTS } from './fonts';
import { block, column, grow, label, ringWithCentre, row } from './primitives';
import { clampPercent, ringSvg } from './ring';
import { widgetPaths } from '../snapshot/deep-links';
import type { WidgetAzkarSession } from '../snapshot/types';

/** The frame's mini session ring (WidgetContinueReading Azkar row): 44 dp, 5 dp stroke. */
const RING_SIZE = 44;
const RING_STROKE = 5;

function sessionPercent(session: WidgetAzkarSession): number {
  if (session.complete) {
    return 100;
  }
  return session.total > 0 ? clampPercent((session.done / session.total) * 100) : 0;
}

/** One session: a progress ring (and a check when complete), with its title under it. */
function sessionTile(ctx: WidgetContext, session: WidgetAzkarSession) {
  const { palette, rtl } = ctx;
  const percent = sessionPercent(session);
  const centre = session.complete
    ? label('✓', { align: 'center', color: palette.brand, font: WIDGET_FONTS.bold, size: 14 }, rtl)
    : null;
  const ring = ringWithCentre(
    ringSvg({
      fill: palette.brand,
      percent,
      size: RING_SIZE,
      stroke: RING_STROKE,
      track: palette.surface,
    }),
    RING_SIZE,
    centre,
  );
  return grow(
    column([ring, label(session.title, { align: 'center', color: palette.ink, font: WIDGET_FONTS.medium, size: 11 }, rtl)], {
      alignItems: 'center',
      flexGap: 6,
    }),
    { alignItems: 'center' },
  );
}

/**
 * The 4×2 Azkar status widget (ADR 0035 §2, ADR 0042): the five sessions, done or not. Without Azkar content in the
 * snapshot it shows the open-the-app state, and it never shows dhikr text (ADR 0035 §1.2).
 */
export function AzkarWidget(ctx: WidgetContext) {
  const { labels, palette, rtl, snapshot } = ctx;
  const click = openPath(ctx, widgetPaths.azkar);

  if (snapshot.azkar === null) {
    return card(ctx, [
      label(labels.azkarTitle, { color: palette.inkMuted, font: WIDGET_FONTS.medium, size: 12 }, rtl),
      label(labels.azkarEmpty, { color: palette.ink, font: WIDGET_FONTS.regular, maxLines: 2, size: 14 }, rtl),
    ], { accessibilityLabel: `${labels.azkarTitle}: ${labels.azkarEmpty}`, click });
  }

  const sessions = snapshot.azkar.sessions;
  const summary = sessions.filter((session) => session.complete).length;
  return card(ctx, [
    label(labels.azkarTitle, { color: palette.inkMuted, font: WIDGET_FONTS.medium, size: 12 }, rtl),
    block({ height: 8 }),
    row(
      sessions.map((session) => sessionTile(ctx, session)),
      rtl,
    ),
  ], {
    accessibilityLabel: `${labels.azkarTitle}: ${formatNumber(summary, ctx.locale)} / ${formatNumber(sessions.length, ctx.locale)}`,
    click,
  });
}
