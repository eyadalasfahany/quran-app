import { isUpdateRequired } from './version';

describe('isUpdateRequired', () => {
  it.each([
    ['1.0.1', '1.0.2', true],
    ['1.0.2', '1.0.2', false],
    ['1.0.3', '1.0.2', false],
    ['1.9.0', '1.10.0', true],
    ['1.10.0', '1.9.0', false],
    ['1.0', '1.0.0', false],
    ['1.0.0', '1.0', false],
    ['1', '1.0.1', true],
    ['2', '1.9.9', false],
  ])('compares %s with minimum %s as %s', (current, minimum, expected) => {
    expect(isUpdateRequired(current, minimum)).toBe(expected);
  });

  it('is false when the installed version is unknown', () => {
    expect(isUpdateRequired(null, '1.0.2')).toBe(false);
  });

  it('is false when there is no minimum', () => {
    expect(isUpdateRequired('1.0.1', null)).toBe(false);
  });

  it('is false when either side is null', () => {
    expect(isUpdateRequired(null, null)).toBe(false);
  });

  it.each(['abc', '1.x', '', ' 1.0.1', '1.0.1 ', 'v1.0.1', '1.0.1-beta'])('is false for the unreadable text "%s"', (text) => {
    expect(isUpdateRequired(text, '1.0.2')).toBe(false);
    expect(isUpdateRequired('1.0.1', text)).toBe(false);
  });
});
