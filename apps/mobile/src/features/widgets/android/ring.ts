/**
 * A progress ring as an SVG string, drawn by the library's SVG widget (AndroidSVG). The geometry matches the frames: a
 * full track circle and a fill arc from the top, clockwise, with round caps. Pure: no native call.
 *
 * The fill is an explicit arc path, not a dashed <circle>: AndroidSVG starts a circle's outline at a different point
 * than browsers, so a rotated dash began at 9 o'clock, and a zero-length dash with round caps still drew a dot.
 */
export type RingInput = {
  size: number;
  stroke: number;
  /** 0 to 100. Values outside are clamped. */
  percent: number;
  track: string;
  fill: string;
};

export function clampPercent(percent: number): number {
  if (!Number.isFinite(percent)) {
    return 0;
  }
  return Math.min(100, Math.max(0, percent));
}

/** Rounds to 3 decimals so the SVG stays short and stable in tests. */
function n(value: number): string {
  return String(Math.round(value * 1000) / 1000);
}

/** The fill arc's path from 12 o'clock, clockwise, over `share` (0 < share < 1) of the circle. */
export function arcPath(center: number, radius: number, share: number): string {
  const angle = share * 2 * Math.PI;
  const endX = center + radius * Math.sin(angle);
  const endY = center - radius * Math.cos(angle);
  const largeArc = share > 0.5 ? 1 : 0;
  return `M ${n(center)} ${n(center - radius)} A ${n(radius)} ${n(radius)} 0 ${largeArc} 1 ${n(endX)} ${n(endY)}`;
}

export function ringSvg({ fill, percent, size, stroke, track }: RingInput): string {
  const center = size / 2;
  const radius = center - stroke / 2;
  const share = clampPercent(percent) / 100;
  const circle = (color: string) =>
    `<circle cx="${n(center)}" cy="${n(center)}" r="${n(radius)}" fill="none" stroke="${color}" stroke-width="${stroke}"/>`;

  let fillShape = '';
  if (share >= 1) {
    fillShape = circle(fill);
  } else if (share > 0) {
    fillShape = `<path d="${arcPath(center, radius, share)}" fill="none" stroke="${fill}" stroke-width="${stroke}" stroke-linecap="round"/>`;
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
    circle(track),
    fillShape,
    '</svg>',
  ].join('');
}
