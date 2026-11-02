import { colors } from '@quran/design-tokens';
import type { RgbaColor } from 'react-native-android-widget';

/** The two widget looks. The platform picks one (the library draws both); the app does not choose. */
export type WidgetMode = 'light' | 'dark';

/** A token colour as the library's colour type (`#rrggbb`). The tokens are hex by definition (design-tokens/colors.ts). */
export type HexColor = `#${string}`;

function hex(value: string): HexColor {
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) {
    throw new Error(`Widget colour must be #rrggbb, got ${value}`);
  }
  return value as HexColor;
}

/** Every colour a widget draws, read from the design tokens (ADR 0010: no raw hex in a layout). */
export type WidgetPalette = {
  surface: HexColor;
  surfaceRaised: HexColor;
  ink: HexColor;
  inkMuted: HexColor;
  line: HexColor;
  fillSecondary: HexColor;
  brand: HexColor;
  onBrand: HexColor;
  brandSurface: HexColor;
  onBrandSurface: HexColor;
  onBrandSurfaceMuted: HexColor;
  goldOnBrandSurface: HexColor;
  gold: HexColor;
  highlightActive: HexColor;
};

export function paletteFor(mode: WidgetMode): WidgetPalette {
  const tokens = colors[mode];
  return {
    brand: hex(tokens.brand),
    brandSurface: hex(tokens.brandSurface),
    fillSecondary: hex(tokens.fillSecondary),
    gold: hex(tokens.gold),
    goldOnBrandSurface: hex(tokens.goldOnBrandSurface),
    highlightActive: hex(tokens.highlightActive),
    ink: hex(tokens.ink),
    inkMuted: hex(tokens.inkMuted),
    line: hex(tokens.line),
    onBrand: hex(tokens.onBrand),
    onBrandSurface: hex(tokens.onBrandSurface),
    onBrandSurfaceMuted: hex(tokens.onBrandSurfaceMuted),
    surface: hex(tokens.surface),
    surfaceRaised: hex(tokens.surfaceRaised),
  };
}

/** A `#rrggbb` colour with an alpha, as `rgba(...)`, which the library accepts. Used for translucent tracks. */
export function withAlpha(color: HexColor, alpha: number): RgbaColor {
  const value = color.slice(1);
  const channel = (start: number) => parseInt(value.slice(start, start + 2), 16);
  return `rgba(${channel(0)}, ${channel(2)}, ${channel(4)}, ${alpha})` as RgbaColor;
}

