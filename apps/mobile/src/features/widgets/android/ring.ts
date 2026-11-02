/**
 * A progress ring as an SVG string, drawn by the library's SVG widget (AndroidSVG). The geometry matches the frames: a
 * full track circle and a fill arc from the top, clockwise, with round caps. Pure: no native call.
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

export function ringSvg({ fill, percent, size, stroke, track }: RingInput): string {
  const center = size / 2;
  const radius = center - stroke / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (clampPercent(percent) / 100) * circumference;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
    `<circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${track}" stroke-width="${stroke}"/>`,
    `<circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${fill}" stroke-width="${stroke}"`,
    ` stroke-linecap="round" stroke-dasharray="${filled} ${circumference}"`,
    ` transform="rotate(-90 ${center} ${center})"/>`,
    '</svg>',
  ].join('');
}
