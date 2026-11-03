'use no memo';

import { FlexWidget } from 'react-native-android-widget';
import type { ReactNode } from 'react';

import { radius } from '@quran/design-tokens';

import { column, label } from './primitives';
import { WIDGET_FONTS } from './fonts';
import type { WidgetContext } from './context';
import type { HexColor } from './theme';

/** Full-height column with space-between — no flex spacers that leave a void. */
export function widgetFaceColumn(children: ReactNode[], style: Record<string, unknown> = {}) {
  return column(children, { height: 'match_parent', justifyContent: 'space-between', width: 'match_parent', ...style });
}

/** Pill chip on fillSecondary (time, counts, meta). */
export function fillChip(ctx: WidgetContext, text: string, options: { ink?: HexColor; size?: number } = {}) {
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

/** Rounded band on brandSurface (remaining, summaries). */
export function brandSurfaceBand(
  ctx: WidgetContext,
  caption: string,
  value: string,
  options: { valueSize?: number } = {},
) {
  const { palette, rtl } = ctx;
  return (
    <FlexWidget
      style={{
        backgroundColor: palette.brandSurface,
        borderRadius: radius.tile,
        flexDirection: 'column',
        flexGap: 6,
        paddingHorizontal: 12,
        paddingVertical: 10,
        width: 'match_parent',
      }}
    >
      {label(caption, { color: palette.onBrandSurfaceMuted, font: WIDGET_FONTS.regular, size: 11 }, rtl)}
      {label(value, { color: palette.onBrandSurface, font: WIDGET_FONTS.bold, size: options.valueSize ?? 22 }, rtl)}
    </FlexWidget>
  );
}

/** Band on fillSecondary for neutral footers (progress summary on raised cards). */
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
