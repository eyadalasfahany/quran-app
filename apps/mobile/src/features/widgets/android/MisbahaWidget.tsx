'use no memo';
// Widget trees are built by calling these functions directly, not rendered as React components, so the React Compiler
// must not memoise them: its useMemoCache hook throws "Invalid hook call" outside a render (the wide widget never drew).

import { FlexWidget } from 'react-native-android-widget';

import { formatNumber } from '@/core/i18n/numbers';

import { card } from './card';
import { openPath, type WidgetContext } from './context';
import { WIDGET_FONTS } from './fonts';
import { column, label, row, ringWithCentre } from './primitives';
import { ringSvg, clampPercent } from './ring';
import { fillSecondaryBand, widgetFaceColumn } from './widget-chrome';
import { MISBAHA_TAP_ACTION } from './names';
import { widgetPaths } from '../snapshot/deep-links';

/** The frame's ring: 96 dp with a 6 dp stroke, centred in the card (AndroidWidgets frame, misbaha card). */
const RING_SIZE = 96;
const RING_STROKE = 6;
/** The «+» is a 36 dp disc at the card's bottom end (left in Arabic, right in English). */
const PLUS_SIZE = 36;

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
      {label('+', { align: 'center', color: palette.onBrand, font: WIDGET_FONTS.bold, size: 24 }, rtl)}
    </FlexWidget>
  );

  const ring = ringWithCentre(
    ringSvg({ fill: palette.brand, percent, size: RING_SIZE, stroke: RING_STROKE, track: palette.fillSecondary }),
    RING_SIZE,
    column(
      [
        label(count, { align: 'center', color: palette.ink, font: WIDGET_FONTS.display, size: 40 }, rtl),
        label(targetText, { align: 'center', color: palette.inkMuted, font: WIDGET_FONTS.regular, size: 11 }, rtl),
      ],
      { alignItems: 'center' },
    ),
  );

  return card(ctx, [
    widgetFaceColumn([
      label(labels.misbaha, { color: palette.inkMuted, font: WIDGET_FONTS.medium, size: 12 }, rtl),
      column([ring], { alignItems: 'center', width: 'match_parent' }),
      column(
        [fillSecondaryBand(ctx, labels.misbaha, targetText), row([plus], rtl, { justifyContent: 'flex-end', width: 'match_parent' })],
        { flexGap: 8, width: 'match_parent' },
      ),
    ]),
  ], {
    accessibilityLabel: `${labels.misbaha}: ${count} ${targetText}`,
    click: openPath(ctx, widgetPaths.misbaha),
  });
}
