'use no memo';
// Widget trees are built by calling these functions directly, not rendered as React components, so the React Compiler
// must not memoise them: its useMemoCache hook throws "Invalid hook call" outside a render (the wide widget never drew).

import { FlexWidget, SvgWidget } from 'react-native-android-widget';

import { formatNumber } from '@/core/i18n/numbers';

import { card } from './card';
import { openPath, type WidgetContext } from './context';
import { WIDGET_FONTS } from './fonts';
import { column, grow, label, row, ringWithCentre } from './primitives';
import { plusIconSvg } from './plus-icon';
import { ringSvg, clampPercent } from './ring';
import { fillSecondaryBand, widgetFaceColumn } from './widget-chrome';
import { MISBAHA_TAP_ACTION } from './names';
import { widgetPaths } from '../snapshot/deep-links';

/** Compact ring for the 2×2 card so the footer row (target + «+») stays on screen. */
const RING_SIZE = 76;
const RING_STROKE = 5;
/** The «+» is a 36 dp disc at the card's bottom end (left in Arabic, right in English). */
const PLUS_SIZE = 36;
/** Digit size inside the ring; IBM Plex (not Amiri) so RemoteViews centre the glyph optically. */
const COUNT_SIZE = 34;

/**
 * The 2×2 misbaha widget: header, ring with bold count, target band and a brand «+» affordance at the foot.
 */
export function MisbahaWidget(ctx: WidgetContext) {
  const { labels, locale, palette, rtl, snapshot } = ctx;
  const { misbaha } = snapshot;
  const count = formatNumber(misbaha.count, locale);
  const target = misbaha.target !== null && misbaha.target > 0 ? misbaha.target : null;
  const targetText = target === null ? labels.misbahaNoTarget : `${labels.of} ${formatNumber(target, locale)}`;
  const percent = target === null ? 0 : clampPercent((misbaha.count / target) * 100);

  const plus = (
    <FlexWidget
      accessibilityLabel={labels.countAction}
      clickAction={MISBAHA_TAP_ACTION}
      clickActionData={{}}
      key="plus"
      style={{
        alignItems: 'center',
        backgroundColor: palette.brand,
        borderColor: palette.onBrand,
        borderRadius: PLUS_SIZE / 2,
        borderWidth: 2,
        height: PLUS_SIZE,
        justifyContent: 'center',
        width: PLUS_SIZE,
      }}
    >
      <SvgWidget style={{ height: PLUS_SIZE - 4, width: PLUS_SIZE - 4 }} svg={plusIconSvg(palette.onBrand, PLUS_SIZE - 4)} />
    </FlexWidget>
  );

  // Count uses UI bold (not Amiri display): Amiri's metrics sit the digit low/right in OverlapWidget.
  const countLabel = (
    <FlexWidget
      style={{
        alignItems: 'center',
        height: RING_SIZE,
        justifyContent: 'center',
        width: RING_SIZE,
      }}
    >
      {label(count, {
        align: 'center',
        color: palette.ink,
        font: WIDGET_FONTS.bold,
        inline: true,
        size: COUNT_SIZE,
      }, rtl)}
    </FlexWidget>
  );

  const ring = ringWithCentre(
    ringSvg({ fill: palette.brand, percent, size: RING_SIZE, stroke: RING_STROKE, track: palette.fillSecondary }),
    RING_SIZE,
    countLabel,
  );

  return card(ctx, [
    widgetFaceColumn([
      label(labels.misbaha, { color: palette.inkMuted, font: WIDGET_FONTS.medium, size: 12 }, rtl),
      column([ring], { alignItems: 'center', width: 'match_parent' }),
      row([grow(fillSecondaryBand(ctx, labels.misbaha, targetText), { flex: 1 }), plus], rtl, {
        alignItems: 'center',
        flexGap: 8,
        width: 'match_parent',
      }),
    ]),
  ], {
    accessibilityLabel: `${labels.misbaha}: ${count} ${targetText}`,
    click: openPath(ctx, widgetPaths.misbaha),
  });
}
