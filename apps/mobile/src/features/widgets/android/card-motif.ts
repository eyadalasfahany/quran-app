/**
 * Hairline eight-point star (design-system ornament language) as a soft watermark for widget cards.
 * Stroke must already include alpha (e.g. `withAlpha(palette.brand, 0.08)`).
 */
export function cardMotifSvg(stroke: string, size = 220): string {
  const c = size / 2;
  const outer = size * 0.38;
  const inner = size * 0.18;
  const points: string[] = [];
  for (let i = 0; i < 8; i += 1) {
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    const r = i % 2 === 0 ? outer : inner;
    points.push(`${(c + r * Math.cos(a)).toFixed(1)},${(c + r * Math.sin(a)).toFixed(1)}`);
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    `<polygon points="${points.join(' ')}" fill="none" stroke="${stroke}" stroke-width="1.25"/>` +
    `<circle cx="${c}" cy="${c}" r="${(inner * 0.55).toFixed(1)}" fill="none" stroke="${stroke}" stroke-width="1"/>` +
    `</svg>`
  );
}
