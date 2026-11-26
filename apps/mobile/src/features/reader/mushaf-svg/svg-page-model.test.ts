import { IDENTITY, multiply } from './svg-page-model';

describe('multiply', () => {
  it('keeps the identity neutral and multiplies in SVG order', () => {
    const p = [2, 0, 0, 3, 5, 7] as const;
    const q = [1, 0, 0, 1, 4, 4] as const;
    expect(multiply(IDENTITY, p)).toEqual(p);
    expect(multiply(p, IDENTITY)).toEqual(p);
    expect(multiply(multiply(p, q), [1, 0, 0, 1, 4, 4])).toEqual(multiply(p, multiply(q, [1, 0, 0, 1, 4, 4])));
  });

  it('applies the right-hand matrix first', () => {
    // translate(1 0) after scale(2): a point at (1, 0) goes to (2, 0) then (3, 0).
    expect(multiply([1, 0, 0, 1, 1, 0], [2, 0, 0, 2, 0, 0])).toEqual([2, 0, 0, 2, 1, 0]);
  });
});
