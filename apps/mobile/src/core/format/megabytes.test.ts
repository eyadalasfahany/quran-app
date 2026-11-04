import { megabytes } from './megabytes';

describe('megabytes', () => {
  it('returns zero for non-positive or non-finite input', () => {
    expect(megabytes(0)).toBe(0);
    expect(megabytes(-1)).toBe(0);
    expect(megabytes(Number.NaN)).toBe(0);
    expect(megabytes(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('rounds to one decimal place', () => {
    expect(megabytes(1024 * 1024)).toBe(1);
    expect(megabytes(4_404_019)).toBe(4.2);
  });
});
