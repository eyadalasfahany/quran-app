import { FlexWidget } from 'react-native-android-widget';

import { formatNumber } from '@/core/i18n/numbers';

import { card } from './card';
import { openPath, type WidgetContext } from './context';
import { WIDGET_FONTS } from './fonts';
import { block, column, grow, label, row, spacer } from './primitives';
import { withAlpha } from './theme';
import { widgetPaths } from '../snapshot/deep-links';

/** The wird bar's split: the filled part and the rest, both 0 to 100 and never negative. */
function barWeights(percent: number): { filled: number; rest: number } {
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));
  return { filled: Math.max(clamped, 0), rest: Math.max(100 - clamped, 0) };
}

/**
 * The 4×2 continue-reading widget (AndroidWidgets frame, the brand card): the surah, the ayah and page, and the wird line
 * when a Khatma plan is active. The only green card (ADR 0035 §2). No ayah text: the surah name, ayah and page only.
 */
export function ContinueReadingWidget(ctx: WidgetContext) {
  const { labels, palette, rtl, snapshot } = ctx;
  const { reading, wird } = snapshot;

  if (reading === null) {
    return card(ctx, [
      label(labels.continueReading, { color: palette.inkMuted, font: WIDGET_FONTS.medium, size: 12 }, rtl),
      label(labels.openApp, { color: palette.ink, font: WIDGET_FONTS.regular, maxLines: 2, size: 14 }, rtl),
    ], { accessibilityLabel: `${labels.continueReading}: ${labels.openApp}`, click: { clickAction: 'OPEN_APP' } });
  }

  const place = `${labels.ayahLabel} ${formatNumber(reading.ayah, ctx.locale)} · ${labels.pageLabel} ${formatNumber(reading.page, ctx.locale)}`;
  const onBrandMuted = palette.onBrandSurfaceMuted;

  const readingColumn = grow(
    column(
      [
        label(labels.continueReading, { color: onBrandMuted, font: WIDGET_FONTS.medium, size: 12 }, rtl),
        label(reading.surah, { color: palette.onBrandSurface, font: WIDGET_FONTS.display, size: 30 }, rtl),
        label(place, { color: onBrandMuted, font: WIDGET_FONTS.regular, size: 13 }, rtl),
        spacer(),
        <FlexWidget
          key="resume"
          style={{
            backgroundColor: palette.surface,
            borderRadius: 16,
            flexDirection: 'row',
            height: 32,
            paddingHorizontal: 14,
            alignItems: 'center',
            justifyContent: 'center',
            width: 'wrap_content',
          }}
        >
          {label(labels.resume, { align: 'center', color: palette.brand, font: WIDGET_FONTS.semiBold, size: 13 }, rtl)}
        </FlexWidget>,
      ],
      { flex: 1 },
    ),
  );

  const wirdColumn = wird === null ? null : wirdBlock(ctx, wird.done, wird.target);
  const divider = wird === null ? null : block({ backgroundColor: withAlpha(palette.onBrandSurface, 0.2), width: 1 });

  return card(
    ctx,
    [
      row([readingColumn, divider, wirdColumn], rtl, { flex: 1 }),
    ],
    {
      accessibilityLabel: `${labels.continueReading}: ${reading.surah}, ${place}`,
      background: palette.brandSurface,
      click: openPath(ctx, widgetPaths.reading(reading.verseKey)),
    },
  );
}

function wirdBlock(ctx: WidgetContext, done: number, target: number) {
  const { labels, palette, locale, rtl } = ctx;
  const fraction = target > 0 ? (done / target) * 100 : 0;
  const { filled, rest } = barWeights(fraction);
  const onBrandMuted = palette.onBrandSurfaceMuted;
  const track = withAlpha(palette.onBrandSurface, 0.2);
  return column(
      [
        label(labels.wirdTitle, { color: onBrandMuted, font: WIDGET_FONTS.regular, size: 12 }, rtl),
        label(`${formatNumber(done, locale)} ${labels.of} ${formatNumber(target, locale)}`, {
          color: palette.onBrandSurface,
          font: WIDGET_FONTS.bold,
          size: 17,
        }, rtl),
        label(labels.wirdUnit, { color: onBrandMuted, font: WIDGET_FONTS.regular, size: 12 }, rtl),
        spacer(),
        row(
          [
            filled > 0 ? block({ backgroundColor: palette.gold, borderRadius: 2, flex: filled, height: 4 }) : null,
            rest > 0 ? block({ backgroundColor: track, borderRadius: 2, flex: rest, height: 4 }) : null,
          ],
          rtl,
          { width: 'match_parent' },
        ),
      ],
      { paddingHorizontal: 10, width: 108 },
  );
}
