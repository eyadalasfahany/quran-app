export type Outline = { d: string; length: number };

export type Point = readonly [number, number];

// One step of a path: a move, a line, a quadratic (control, end), a cubic (control 1, control 2, end) or a close.
export type Segment =
  | readonly ['M', Point]
  | readonly ['L', Point]
  | readonly ['Q', Point, Point]
  | readonly ['C', Point, Point, Point]
  | readonly ['Z'];

// Straight steps used to measure a curve's length.
const CURVE_STEPS = 24;

export function polygon(points: readonly Point[]): Outline {
  let length = 0;
  points.forEach(([x, y], index) => {
    const [nx, ny] = points[(index + 1) % points.length] ?? [x, y];
    length += Math.hypot(nx - x, ny - y);
  });
  const d = `${points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${round(x)} ${round(y)}`).join(' ')} Z`;
  return { d, length };
}

// An outline from moves, lines and Bézier curves. A curve's length is the sum of 24 chords.
export function path(segments: readonly Segment[]): Outline {
  const parts: string[] = [];
  let length = 0;
  let current: Point = [0, 0];
  let start: Point = [0, 0];
  const line = (to: Point) => {
    length += Math.hypot(to[0] - current[0], to[1] - current[1]);
    current = to;
  };

  for (const segment of segments) {
    switch (segment[0]) {
      case 'M':
        parts.push(`M${point(segment[1])}`);
        current = segment[1];
        start = segment[1];
        break;
      case 'L':
        parts.push(`L${point(segment[1])}`);
        line(segment[1]);
        break;
      case 'Q': {
        const [, control, end] = segment;
        parts.push(`Q${point(control)} ${point(end)}`);
        length += curveLength(current, (t) => quadratic(current, control, end, t));
        current = end;
        break;
      }
      case 'C': {
        const [, control1, control2, end] = segment;
        parts.push(`C${point(control1)} ${point(control2)} ${point(end)}`);
        length += curveLength(current, (t) => cubic(current, control1, control2, end, t));
        current = end;
        break;
      }
      case 'Z':
        parts.push('Z');
        line(start);
        break;
    }
  }
  return { d: parts.join(' '), length };
}

// Several outlines drawn as one path: the d strings joined, the lengths added.
export function joinOutlines(outlines: readonly Outline[]): Outline {
  return {
    d: outlines.map((outline) => outline.d).join(' '),
    length: outlines.reduce((total, outline) => total + outline.length, 0),
  };
}

export function circle(cx: number, cy: number, r: number): Outline {
  return {
    d: `M${round(cx + r)} ${round(cy)} A${round(r)} ${round(r)} 0 1 1 ${round(cx - r)} ${round(cy)} A${round(r)} ${round(r)} 0 1 1 ${round(cx + r)} ${round(cy)} Z`,
    length: 2 * Math.PI * r,
  };
}

export function square(cx: number, cy: number, r: number, angle = 0): Outline {
  return polygon([0, 90, 180, 270].map((corner) => polar(cx, cy, r, corner + angle + 45)));
}

export function eightPointStar(cx: number, cy: number, r: number): Outline[] {
  return [square(cx, cy, r), square(cx, cy, r, 45)];
}

export function polar(cx: number, cy: number, r: number, degrees: number): Point {
  const radians = (degrees * Math.PI) / 180;
  return [cx + r * Math.cos(radians), cy + r * Math.sin(radians)];
}

function point([x, y]: Point): string {
  return `${round(x)} ${round(y)}`;
}

function quadratic(p0: Point, p1: Point, p2: Point, t: number): Point {
  const u = 1 - t;
  return [
    u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
    u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
  ];
}

function cubic(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [
    a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
    a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
  ];
}

function curveLength(from: Point, at: (t: number) => Point): number {
  let length = 0;
  let previous = from;
  for (let step = 1; step <= CURVE_STEPS; step += 1) {
    const next = at(step / CURVE_STEPS);
    length += Math.hypot(next[0] - previous[0], next[1] - previous[1]);
    previous = next;
  }
  return length;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
