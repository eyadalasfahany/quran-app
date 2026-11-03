'use no memo';
// Widget trees are built by calling these functions directly, not rendered as React components, so the React Compiler
// must not memoise them: its useMemoCache hook throws "Invalid hook call" outside a render (the wide widget never drew).

import { FlexWidget } from 'react-native-android-widget';

import { formatNumber } from '@/core/i18n/numbers';

import { card } from './card';
import { openPath, type WidgetContext } from './context';
import { WIDGET_FONTS } from './fonts';
import { block, column, grow, label, row } from './primitives';
import { withAlpha } from './theme';
import { widgetFaceColumn } from './widget-chrome';
import { widgetPaths } from '../snapshot/deep-links';

/** The wird bar's split: the filled part and the rest, both 0 to 100 and never negative. */
function barWeights(percent: number): { filled: number; rest: number } {
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));
  return { filled: Math.max(clamped, 0), rest: Math.max(100 - clamped, 0) };
}

/** The gap between the reading and the wird column (AndroidWidgets frame: 14 dp). */
const COLUMN_GAP = 14;
/** The wird column's width (AndroidWidgets frame: 108 dp). */
const WIRD_WIDTH = 108;

/**
 * The 4×2 continue-reading widget: brand card with tight type hierarchy, place chip, resume pill and optional wird.
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

  const resume = (
    <FlexWidget
      key="resume"
      style={{
        alignItems: 'center',
        backgroundColor: palette.onBrandSurface,
        borderRadius: 16,
        flexDirection: 'row',
        height: 32,
        justifyContent: 'center',
        paddingHorizontal: 14,
        width: 'wrap_content',
      }}
    >
      {label(labels.resume, { align: 'center', color: palette.brandSurface, font: WIDGET_FONTS.semiBold, inline: true, size: 13 }, rtl)}
    </FlexWidget>
  );

  const placeChip = (
    <FlexWidget
      style={{
        alignSelf: 'flex_start',
        backgroundColor: withAlpha(palette.onBrandSurface, 0.14),
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}
    >
      {label(place, { color: onBrandMuted, font: WIDGET_FONTS.medium, inline: true, size: 12 }, rtl)}
    </FlexWidget>
  );

  const readingColumn = grow(
    widgetFaceColumn([
      column([
        label(labels.continueReading, { color: onBrandMuted, font: WIDGET_FONTS.medium, size: 12 }, rtl),
        block({ height: 4 }),
        label(reading.surah, { color: palette.onBrandSurface, font: WIDGET_FONTS.display, size: 34 }, rtl),
        block({ height: 6 }),
        placeChip,
      ]),
      row([resume], rtl, { width: 'match_parent' }),
    ]),
    { height: 'match_parent' },
  );

  const wirdColumn = wird === null ? null : wirdBlock(ctx, wird.done, wird.target);
  const divider =
    wird === null ? null : block({ backgroundColor: withAlpha(palette.onBrandSurface, 0.2), height: 'match_parent', width: 1 });

  return card(
    ctx,
    [row([readingColumn, divider, wirdColumn], rtl, { flex: 1, flexGap: COLUMN_GAP })],
    {
      accessibilityLabel: `${labels.continueReading}: ${reading.surah}, ${place}`,
      background: palette.brandSurface,
      click: openPath(ctx, widgetPaths.reading(reading.verseKey)),
    },
  );
}

/** Wird column: count chip and progress bar. */
function wirdBlock(ctx: WidgetContext, done: number, target: number) {
  const { labels, palette, locale, rtl } = ctx;
  const fraction = target > 0 ? (done / target) * 100 : 0;
  const { filled, rest } = barWeights(fraction);
  const onBrandMuted = palette.onBrandSurfaceMuted;
  const track = withAlpha(palette.onBrandSurface, 0.2);
  return column(
    [
      label(labels.wirdTitle, { color: onBrandMuted, font: WIDGET_FONTS.regular, size: 11 }, rtl),
      block({ height: 4 }),
      <FlexWidget
        key="wird-chip"
        style={{
          alignSelf: 'flex_start',
          backgroundColor: withAlpha(palette.onBrandSurface, 0.14),
          borderRadius: 999,
          paddingHorizontal: 8,
          paddingVertical: 4,
        }}
      >
        {label(`${formatNumber(done, locale)} ${labels.of} ${formatNumber(target, locale)}`, {
          color: palette.onBrandSurface,
          font: WIDGET_FONTS.bold,
          inline: true,
          size: 15,
        }, rtl)}
      </FlexWidget>,
      label(labels.wirdUnit, { color: onBrandMuted, font: WIDGET_FONTS.regular, size: 11 }, rtl),
      block({ height: 6 }),
      row(
        [
          filled > 0 ? block({ backgroundColor: palette.gold, borderRadius: 2, flex: filled, height: 4 }) : null,
          rest > 0 ? block({ backgroundColor: track, borderRadius: 2, flex: rest, height: 4 }) : null,
        ],
        rtl,
        { width: 'match_parent' },
      ),
    ],
    { justifyContent: 'center', width: WIRD_WIDTH },
  );
}
