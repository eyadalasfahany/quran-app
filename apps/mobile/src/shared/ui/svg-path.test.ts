import { circle, eightPointStar, polar, polygon, square } from './svg-path';

describe('svg-path', () => {
  it('closes a polygon and measures every side, the closing one included', () => {
    const triangle = polygon([
      [0, 0],
      [3, 0],
      [3, 4],
    ]);

    expect(triangle.d).toBe('M0 0 L3 0 L3 4 Z');
    expect(triangle.length).toBe(12);
  });

  it('draws a circle as two arcs with its circumference as length', () => {
    const ring = circle(50, 50, 12);

    expect(ring.d).toBe('M62 50 A12 12 0 1 1 38 50 A12 12 0 1 1 62 50 Z');
    expect(ring.length).toBeCloseTo(2 * Math.PI * 12);
  });

  it('puts a square’s corners r from its centre, turned by the angle', () => {
    expect(square(50, 50, 28 * Math.SQRT2).d).toBe('M78 78 L22 78 L22 22 L78 22 Z');
    expect(square(50, 50, 10, 45).d).toBe('M50 60 L40 50 L50 40 L60 50 Z');
    expect(square(0, 0, 10).length).toBeCloseTo(4 * 10 * Math.SQRT2);
  });

  it('builds the eight-pointed star from two squares 45° apart', () => {
    const [upright, turned] = eightPointStar(0, 0, 10);

    expect(upright).toEqual(square(0, 0, 10));
    expect(turned).toEqual(square(0, 0, 10, 45));
  });

  it('measures angles clockwise from the x axis, as SVG does', () => {
    const [x, y] = polar(0, 0, 10, 90);

    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(10);
  });
});
