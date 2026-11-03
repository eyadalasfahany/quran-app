import type { HexColor } from './theme';

/** Centred «+» as SVG so RemoteViews text metrics cannot offset the glyph in the disc. */
export function plusIconSvg(color: HexColor, size = 36): string {
  const mid = size / 2;
  const arm = size * 0.28;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    `<path d="M${mid} ${mid - arm}v${arm * 2}M${mid - arm} ${mid}h${arm * 2}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round"/>` +
    `</svg>`;
}
