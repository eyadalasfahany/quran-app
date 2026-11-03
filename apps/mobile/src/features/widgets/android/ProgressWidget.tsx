'use no memo';
// Widget trees are built by calling these functions directly, not rendered as React components, so the React Compiler
// must not memoise them: its useMemoCache hook throws "Invalid hook call" outside a render (the wide widget never drew).

import { FlexWidget, ListWidget } from 'react-native-android-widget';

import { formatNumber, formatPercent } from '@/core/i18n/numbers';

import { card } from './card';
import { openPath, type WidgetContext } from './context';
import { WIDGET_FONTS } from './fonts';
import { block, label, grow, column, row, ringWithCentre } from './primitives';
import { ringSvg } from './ring';
import { ON_BRAND_WASH_ALPHA_LIGHT, onBrandSoftBand, widgetFaceColumn } from './widget-chrome';
import { widgetPaths } from '../snapshot/deep-links';
import type { WidgetProgressRow } from '../snapshot/types';
import { withAlpha } from './theme';

/** Scrollable goal list height under the title (4×2 card). */
const GOAL_LIST_HEIGHT = 92;

/** The frame's ring: 92 dp with a 9 dp stroke (AndroidWidgets frame, progress card). */
const RING_SIZE = 92;
const RING_STROKE = 9;

function progressRow(ctx: WidgetContext, item: WidgetProgressRow) {
  const { palette, rtl } = ctx;
  const track = withAlpha(palette.onBrandSurface, 0.2);
  const check = (
    <FlexWidget
      key="check"
      style={{
        alignItems: 'center',
        backgroundColor: item.done ? palette.gold : withAlpha(palette.onBrandSurface, ON_BRAND_WASH_ALPHA_LIGHT),
        borderColor: item.done ? withAlpha(palette.gold, 0) : track,
        borderRadius: 9,
        borderWidth: item.done ? 0 : 1,
        height: 18,
        justifyContent: 'center',
        width: 18,
      }}
    >
      {item.done ? label('✓', { align: 'center', color: palette.brandSurface, font: WIDGET_FONTS.bold, size: 11 }, rtl) : null}
    </FlexWidget>
  );
  return row(
    [
      check,
      grow(label(item.label, { color: palette.onBrandSurface, font: WIDGET_FONTS.medium, size: 13 }, rtl), { paddingHorizontal: 8 }),
      label(item.value, { color: palette.onBrandSurfaceMuted, font: WIDGET_FONTS.medium, inline: true, size: 12 }, rtl),
    ],
    rtl,
  );
}

function progressSummary(ctx: WidgetContext): string {
  const { labels, locale, snapshot } = ctx;
  const rows = snapshot.progress.rows;
  if (rows.length === 0) {
    return labels.progressEmpty;
  }
  const done = rows.filter((row) => row.done).length;
  return `${formatNumber(done, locale)} ${labels.of} ${formatNumber(rows.length, locale)}`;
}

/**
 * The 4×2 progress widget: gold ring on onBrand track, denser goal rows and a soft onBrand summary band at the foot.
 */
export function ProgressWidget(ctx: WidgetContext) {
  const { labels, palette, rtl, snapshot } = ctx;
  const { progress } = snapshot;
  const percentText = formatPercent(progress.percent, ctx.locale);
  const ringTrack = withAlpha(palette.onBrandSurface, 0.2);
  const ring = ringWithCentre(
    ringSvg({ fill: palette.gold, percent: progress.percent, size: RING_SIZE, stroke: RING_STROKE, track: ringTrack }),
    RING_SIZE,
    label(percentText, { align: 'center', color: palette.onBrandSurface, font: WIDGET_FONTS.bold, size: 22 }, rtl),
  );

  const goalRows = progress.rows.map((item) => progressRow(ctx, item));
  const body =
    goalRows.length === 0 ? (
      label(labels.progressEmpty, { color: palette.onBrandSurfaceMuted, font: WIDGET_FONTS.regular, maxLines: 2, size: 13 }, rtl)
    ) : (
      <ListWidget style={{ height: GOAL_LIST_HEIGHT, width: 'match_parent' }}>{goalRows}</ListWidget>
    );

  return card(
    ctx,
    [
      widgetFaceColumn([
        row(
          [
            ring,
            grow(
              column(
                [
                  label(labels.progressTitle, { color: palette.onBrandSurfaceMuted, font: WIDGET_FONTS.medium, size: 12 }, rtl),
                  block({ height: 8 }),
                  body,
                ],
                { flex: 1, width: 'match_parent' },
              ),
              { paddingHorizontal: 12 },
            ),
          ],
          rtl,
          { alignItems: 'center', flex: 1 },
        ),
        onBrandSoftBand(ctx, labels.progressTitle, goalRows.length === 0 ? labels.progressEmpty : progressSummary(ctx)),
      ]),
    ],
    {
      accessibilityLabel: `${labels.progressTitle}: ${percentText}`,
      click: openPath(ctx, widgetPaths.progress),
    },
  );
}
