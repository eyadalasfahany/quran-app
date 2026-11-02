import { FlexWidget } from 'react-native-android-widget';

import { formatNumber } from '@/core/i18n/numbers';

import { card } from './card';
import { openPath, type WidgetContext } from './context';
import { WIDGET_FONTS } from './fonts';
import { label, column, row, ringWithCentre, spacer } from './primitives';
import { ringSvg, clampPercent } from './ring';
import { MISBAHA_TAP_ACTION } from './names';
import { widgetPaths } from '../snapshot/deep-links';

const RING_SIZE = 84;
const PLUS_SIZE = 34;

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
      {label('+', { align: 'center', color: palette.onBrand, font: WIDGET_FONTS.bold, size: 22 }, rtl)}
    </FlexWidget>
  );

  return card(
    ctx,
    [
      label(labels.misbaha, { color: palette.inkMuted, font: WIDGET_FONTS.medium, size: 12 }, rtl),
      ringWithCentre(
        ringSvg({ fill: palette.brand, percent, size: RING_SIZE, stroke: 7, track: palette.fillSecondary }),
        RING_SIZE,
        column(
          [
            label(count, { align: 'center', color: palette.ink, font: WIDGET_FONTS.display, size: 34 }, rtl),
            label(targetText, { align: 'center', color: palette.inkMuted, font: WIDGET_FONTS.regular, size: 11 }, rtl),
          ],
          { alignItems: 'center' },
        ),
      ),
      row([spacer(), plus], rtl),
    ],
    {
      accessibilityLabel: `${labels.misbaha}: ${count} ${targetText}`,
      click: openPath(ctx, widgetPaths.misbaha),
    },
  );
}
