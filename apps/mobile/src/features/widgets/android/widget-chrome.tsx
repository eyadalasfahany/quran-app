'use no memo';

import { FlexWidget } from 'react-native-android-widget';
import type { ReactNode } from 'react';

import { radius } from '@quran/design-tokens';

import { column, label } from './primitives';
import { WIDGET_FONTS } from './fonts';
import type { WidgetContext } from './context';
import type { HexColor } from './theme';
import { withAlpha } from './theme';

/** Frosted wash on brandSurface (chips, meta bands, tiles). Clearer than 0.14 so cards read on green. */
export const ON_BRAND_WASH_ALPHA = 0.2;
/** Lighter wash for secondary tiles (wide prayer non-next, Azkar complete). */
export const ON_BRAND_WASH_ALPHA_LIGHT = 0.1;
/** Hairline on frosted cards for edge definition. */
const ON_BRAND_CARD_BORDER_ALPHA = 0.12;

/** Full-height column with space-between — no flex spacers that leave a void. */
export function widgetFaceColumn(children: ReactNode[], style: Record<string, unknown> = {}) {
  return column(children, { height: 'match_parent', justifyContent: 'space-between', width: 'match_parent', ...style });
}

/** Pill chip on fillSecondary (legacy neutral; prefer onBrandChip on green faces). */
export function fillChip(
  ctx: WidgetContext,
  text: string,
  options: { ink?: HexColor; size?: number; face?: 'brand' | 'neutral' } = {},
) {
  if (options.face !== 'neutral') {
    return onBrandChip(ctx, text, { muted: false, size: options.size });
  }
  const { palette, rtl } = ctx;
  return column(
    [
      <FlexWidget
        key="chip"
        style={{
          backgroundColor: palette.fillSecondary,
          borderRadius: radius.pill,
          paddingHorizontal: 10,
          paddingVertical: 4,
        }}
      >
        {label(text, {
          color: options.ink ?? palette.ink,
          font: WIDGET_FONTS.semiBold,
          inline: true,
          size: options.size ?? 15,
        }, rtl)}
      </FlexWidget>,
    ],
    { alignItems: rtl ? 'flex-end' : 'flex-start', width: 'match_parent' },
  );
}

/** Pill chip on brandSurface (time, place, counts). */
export function onBrandChip(
  ctx: WidgetContext,
  text: string,
  options: { muted?: boolean; size?: number } = {},
) {
  const { palette, rtl } = ctx;
  return column(
    [
      <FlexWidget
        key="chip"
        style={{
          backgroundColor: withAlpha(palette.onBrandSurface, ON_BRAND_WASH_ALPHA),
          borderColor: withAlpha(palette.onBrandSurface, ON_BRAND_CARD_BORDER_ALPHA),
          borderRadius: radius.pill,
          borderWidth: 1,
          paddingHorizontal: 10,
          paddingVertical: 4,
        }}
      >
        {label(text, {
          color: options.muted ? palette.onBrandSurfaceMuted : palette.onBrandSurface,
          font: WIDGET_FONTS.semiBold,
          inline: true,
          size: options.size ?? 15,
        }, rtl)}
      </FlexWidget>,
    ],
    { alignItems: rtl ? 'flex-end' : 'flex-start', width: 'match_parent' },
  );
}

/** Foot band on brandSurface: frosted wash + cream type (Misbaha target, progress summary, remaining). */
export function onBrandSoftBand(
  ctx: WidgetContext,
  caption: string,
  value: string,
  options: { valueSize?: number } = {},
) {
  const { palette, rtl } = ctx;
  return (
    <FlexWidget
      style={{
        backgroundColor: withAlpha(palette.onBrandSurface, ON_BRAND_WASH_ALPHA),
        borderColor: withAlpha(palette.onBrandSurface, ON_BRAND_CARD_BORDER_ALPHA),
        borderRadius: radius.tile,
        borderWidth: 1,
        flexDirection: 'column',
        flexGap: 4,
        paddingHorizontal: 14,
        paddingVertical: 12,
        width: 'match_parent',
      }}
    >
      {label(caption, { color: palette.onBrandSurfaceMuted, font: WIDGET_FONTS.medium, size: 12 }, rtl)}
      {label(value, { color: palette.onBrandSurface, font: WIDGET_FONTS.bold, size: options.valueSize ?? 20 }, rtl)}
    </FlexWidget>
  );
}

/** @deprecated Use onBrandSoftBand on green widget faces. */
export function brandSurfaceBand(
  ctx: WidgetContext,
  caption: string,
  value: string,
  options: { valueSize?: number } = {},
) {
  return onBrandSoftBand(ctx, caption, value, options);
}

/** Band on fillSecondary for neutral footers (not used on brand faces). */
export function fillSecondaryBand(ctx: WidgetContext, caption: string, value: string) {
  const { palette, rtl } = ctx;
  return (
    <FlexWidget
      style={{
        backgroundColor: palette.fillSecondary,
        borderRadius: radius.tile,
        flexDirection: 'column',
        paddingHorizontal: 12,
        paddingVertical: 8,
        width: 'match_parent',
      }}
    >
      {label(caption, { color: palette.inkMuted, font: WIDGET_FONTS.regular, size: 11 }, rtl)}
      {label(value, { color: palette.ink, font: WIDGET_FONTS.bold, size: 15 }, rtl)}
    </FlexWidget>
  );
}
