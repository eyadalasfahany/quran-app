'use no memo';
// Widget trees are built by calling these functions directly, not rendered as React components, so the React Compiler
// must not memoise them: its useMemoCache hook throws "Invalid hook call" outside a render (the wide widget never drew).

import { FlexWidget } from 'react-native-android-widget';

import { formatPercent } from '@/core/i18n/numbers';

import { card } from './card';
import { openPath, type WidgetContext } from './context';
import { WIDGET_FONTS } from './fonts';
import { block, label, grow, column, row, ringWithCentre } from './primitives';
import { ringSvg } from './ring';
import { widgetPaths } from '../snapshot/deep-links';
import type { WidgetProgressRow } from '../snapshot/types';

/** The most rows the 4×2 card fits (the frame shows four). */
export const PROGRESS_ROWS_SHOWN = 4;

/** The frame's ring: 92 dp with a 9 dp stroke (AndroidWidgets frame, progress card). */
const RING_SIZE = 92;
const RING_STROKE = 9;

function progressRow(ctx: WidgetContext, item: WidgetProgressRow) {
  const { palette, rtl } = ctx;
  const check = (
    <FlexWidget
      key="check"
      style={{
        alignItems: 'center',
        backgroundColor: item.done ? palette.brand : palette.surfaceRaised,
        borderColor: palette.line,
        borderRadius: 9,
        borderWidth: item.done ? 0 : 1.5,
        height: 18,
        justifyContent: 'center',
        width: 18,
      }}
    >
      {item.done ? label('✓', { align: 'center', color: palette.onBrand, font: WIDGET_FONTS.bold, size: 11 }, rtl) : null}
    </FlexWidget>
  );
  return row(
    [
      check,
      grow(label(item.label, { color: palette.ink, font: WIDGET_FONTS.medium, size: 13 }, rtl), { paddingHorizontal: 8 }),
      label(item.value, { color: palette.inkMuted, font: WIDGET_FONTS.medium, inline: true, size: 12 }, rtl),
    ],
    rtl,
  );
}

/**
 * The 4×2 progress widget (AndroidWidgets frame, the ring card): today's percent in a ring, then the chosen goals. With
 * no goals chosen it asks the user to choose them, as the app does (ADR 0034 §5).
 */
export function ProgressWidget(ctx: WidgetContext) {
  const { labels, palette, rtl, snapshot } = ctx;
  const { progress } = snapshot;
  const percentText = formatPercent(progress.percent, ctx.locale);
  const ring = ringWithCentre(
    ringSvg({ fill: palette.brand, percent: progress.percent, size: RING_SIZE, stroke: RING_STROKE, track: palette.fillSecondary }),
    RING_SIZE,
    label(percentText, { align: 'center', color: palette.ink, font: WIDGET_FONTS.bold, size: 22 }, rtl),
  );

  const rows = progress.rows.slice(0, PROGRESS_ROWS_SHOWN).map((item) => progressRow(ctx, item));
  const body =
    rows.length === 0
      ? label(labels.progressEmpty, { color: palette.inkMuted, font: WIDGET_FONTS.regular, maxLines: 2, size: 13 }, rtl)
      : column(rows, { flexGap: 6 });

  // The row fills the card's height, so the ring and the text block sit in the middle, as the frame draws them.
  return card(
    ctx,
    [
      row(
        [
          ring,
          grow(
            column(
              [label(labels.progressTitle, { color: palette.inkMuted, font: WIDGET_FONTS.medium, size: 12 }, rtl), block({ height: 6 }), body],
              { flex: 1 },
            ),
            { paddingHorizontal: 10 },
          ),
        ],
        rtl,
        { flex: 1 },
      ),
    ],
    {
      accessibilityLabel: `${labels.progressTitle}: ${percentText}`,
      click: openPath(ctx, widgetPaths.progress),
    },
  );
}
