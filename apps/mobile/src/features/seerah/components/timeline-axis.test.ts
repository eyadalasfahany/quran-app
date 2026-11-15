import { alongSize, alongStart, fractionOfTouch } from './timeline-axis';

describe('timeline axis helpers', () => {
  it('positions along the start edge on the horizontal bar and from the top on the vertical one', () => {
    expect(alongStart('horizontal', 0.25)).toEqual({ start: '25%' });
    expect(alongStart('vertical', 0.5)).toEqual({ top: '50%' });
    expect(alongSize('horizontal', 0.1875)).toEqual({ width: '18.75%' });
    expect(alongSize('vertical', 0.5)).toEqual({ height: '50%' });
  });

  it.each([
    ['horizontal', 50, 200, false, 0.25],
    ['horizontal', 50, 200, true, 0.75],
    ['vertical', 50, 200, true, 0.25],
    ['vertical', 50, 200, false, 0.25],
    ['horizontal', -20, 200, false, 0],
    ['horizontal', 999, 200, false, 1],
    ['horizontal', 10, 0, false, 0],
  ] as const)('%s touch at %p of %p (rtl %p) is %p', (orientation, offset, length, rtl, expected) => {
    expect(fractionOfTouch(orientation, offset, length, rtl)).toBe(expected);
  });
});
