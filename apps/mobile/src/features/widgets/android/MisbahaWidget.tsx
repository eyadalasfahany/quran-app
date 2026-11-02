'use no memo';
// Widget trees are built by calling these functions directly, not rendered as React components, so the React Compiler
// must not memoise them: its useMemoCache hook throws "Invalid hook call" outside a render (the wide widget never drew).

import { FlexWidget } from 'react-native-android-widget';

import { formatNumber } from '@/core/i18n/numbers';

import { card } from './card';
import { openPath, type WidgetContext } from './context';
import { WIDGET_FONTS } from './fonts';
import { column, label, layered, row, ringWithCentre, spacer } from './primitives';
import { ringSvg, clampPercent } from './ring';
import { MISBAHA_TAP_ACTION } from './names';
import { widgetPaths } from '../snapshot/deep-links';

/** The frame's ring: 96 dp with a 6 dp stroke, centred in the card (AndroidWidgets frame, misbaha card). */
const RING_SIZE = 96;
const RING_STROKE = 6;
/** The «+» is a 36 dp disc at the card's bottom end (left in Arabic, right in English). */
const PLUS_SIZE = 36;

/**
 * The 2×2 misbaha widget (AndroidWidgets frame): today's count against the target, and a «+» that counts one tap without
 * opening the app (ADR 0035 decision 3). The «+» is its own clickable area with the custom tap action; the rest of the
 * card opens the misbaha screen. Haptics are not available from a widget, so none is played.
 */
export function MisbahaWidget(ctx: WidgetContext) {
  const { labels, locale, palette, rtl, snapshot } = ctx;
  const { misbaha } = snapshot;
  const count = formatNumber(misbaha.count, locale);
  // No target («بلا حد») draws an empty ring and the label instead of a count of a target.
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
        borderRadius: PLUS_SIZE / 2,
        height: PLUS_SIZE,
        justifyContent: 'center',
        width: PLUS_SIZE,
      }}
    >
      {label('+', { align: 'center', color: palette.onBrand, font: WIDGET_FONTS.bold, size: 24 }, rtl)}
    </FlexWidget>
  );

  // The ring sits in the middle of the free space under the label; the «+» is a second layer pinned to the bottom, so the
  // ring keeps its full size (the frame's ring is larger than the card's height left after a row for the «+»).
  const ring = column(
    [
      ringWithCentre(
        ringSvg({ fill: palette.brand, percent, size: RING_SIZE, stroke: RING_STROKE, track: palette.surface }),
        RING_SIZE,
        column(
          [
            label(count, { align: 'center', color: palette.ink, font: WIDGET_FONTS.display, size: 40 }, rtl),
            label(targetText, { align: 'center', color: palette.inkMuted, font: WIDGET_FONTS.regular, size: 11 }, rtl),
          ],
          { alignItems: 'center' },
        ),
      ),
    ],
    { alignItems: 'center', width: 'match_parent' },
  );

  const body = column(
    [label(labels.misbaha, { color: palette.inkMuted, font: WIDGET_FONTS.medium, size: 12 }, rtl), spacer(), ring, spacer()],
    { height: 'match_parent', width: 'match_parent' },
  );
  const bottom = column([spacer(), row([spacer(), plus], rtl, { width: 'match_parent' })], {
    height: 'match_parent',
    width: 'match_parent',
  });

  return card(ctx, [layered([body, bottom])], {
    accessibilityLabel: `${labels.misbaha}: ${count} ${targetText}`,
    click: openPath(ctx, widgetPaths.misbaha),
  });
}
