// SVG outlines with their lengths, so a stroke can be drawn in with a dash offset.
export type Outline = { d: string; length: number };

export type Point = readonly [number, number];

export function polygon(points: readonly Point[]): Outline {
  let length = 0;
  points.forEach(([x, y], index) => {
    const [nx, ny] = points[(index + 1) % points.length] ?? [x, y];
    length += Math.hypot(nx - x, ny - y);
  });
  const d = `${points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${round(x)} ${round(y)}`).join(' ')} Z`;
  return { d, length };
}

export function circle(cx: number, cy: number, r: number): Outline {
  return {
    d: `M${round(cx + r)} ${round(cy)} A${round(r)} ${round(r)} 0 1 1 ${round(cx - r)} ${round(cy)} A${round(r)} ${round(r)} 0 1 1 ${round(cx + r)} ${round(cy)} Z`,
    length: 2 * Math.PI * r,
  };
}

// A square with its centre at (cx, cy) and corners `r` from it, turned by `angle` degrees.
export function square(cx: number, cy: number, r: number, angle = 0): Outline {
  return polygon([0, 90, 180, 270].map((corner) => polar(cx, cy, r, corner + angle + 45)));
}

// The eight-pointed star of two overlapping squares, as in ۞ (rub el hizb).
export function eightPointStar(cx: number, cy: number, r: number): Outline[] {
  return [square(cx, cy, r), square(cx, cy, r, 45)];
}

export function polar(cx: number, cy: number, r: number, degrees: number): Point {
  const radians = (degrees * Math.PI) / 180;
  return [cx + r * Math.cos(radians), cy + r * Math.sin(radians)];
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
