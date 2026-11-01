import { countTap, DEFAULT_SIBHA_STATE, isPresetTarget, parseSibhaNumber, parseSibhaState, todayTotalFor, toggleTarget } from './model';

describe('parseSibhaNumber', () => {
  it.each([
    ['1', 1],
    ['33', 33],
    ['9999', 9999],
    [' 250 ', 250],
    ['١٠٠', 100],
  ])('reads "%s" as %i', (input, value) => {
    expect(parseSibhaNumber(input)).toBe(value);
  });

  it.each(['', '0', '-3', '1.5', 'abc', '10000', '12345'])('rejects "%s"', (input) => {
    expect(parseSibhaNumber(input)).toBeNull();
  });
});

describe('parseSibhaState', () => {
  it('returns the default for a missing value', () => {
    expect(parseSibhaState(undefined)).toEqual(DEFAULT_SIBHA_STATE);
  });

  it('returns the default for a value that is not JSON', () => {
    expect(parseSibhaState('{nope')).toEqual(DEFAULT_SIBHA_STATE);
  });

  it('keeps each valid field and defaults the others', () => {
    expect(parseSibhaState(JSON.stringify({ count: 12, label: 'تسمية تجريبية', target: 99 }))).toEqual({
      count: 12,
      label: 'تسمية تجريبية',
      target: 99,
    });
    expect(parseSibhaState(JSON.stringify({ count: -4, label: 7, target: 'x' }))).toEqual({
      count: 0,
      label: '',
      target: DEFAULT_SIBHA_STATE.target,
    });
  });

  it('keeps an explicit null target and cuts a long label', () => {
    const parsed = parseSibhaState(JSON.stringify({ count: 1, label: 'x'.repeat(60), target: null }));
    expect(parsed.target).toBeNull();
    expect(parsed.label).toHaveLength(40);
  });
});

describe('todayTotalFor', () => {
  it('returns the saved total for the same local date', () => {
    expect(todayTotalFor(JSON.stringify({ date: '2026-11-01', total: 42 }), '2026-11-01')).toBe(42);
  });

  it('is zero on a new date', () => {
    expect(todayTotalFor(JSON.stringify({ date: '2026-11-01', total: 42 }), '2026-11-02')).toBe(0);
  });

  it('is zero for a missing or damaged value', () => {
    expect(todayTotalFor(undefined, '2026-11-01')).toBe(0);
    expect(todayTotalFor('[', '2026-11-01')).toBe(0);
  });
});

describe('countTap', () => {
  it('adds one and never caps the count', () => {
    const result = countTap({ count: 4, label: '', target: null });
    expect(result).toEqual({ reachedTarget: false, state: { count: 5, label: '', target: null } });
  });

  it('reports the target only on the tap that reaches it', () => {
    expect(countTap({ count: 97, label: '', target: 99 }).reachedTarget).toBe(false);
    expect(countTap({ count: 98, label: '', target: 99 }).reachedTarget).toBe(true);
  });

  it('does not report a target again once passed', () => {
    expect(countTap({ count: 99, label: '', target: 99 }).reachedTarget).toBe(false);
    expect(countTap({ count: 99, label: '', target: 99 }).state.count).toBe(100);
  });
});

describe('toggleTarget and isPresetTarget', () => {
  it('sets a target and clears it when the active chip is pressed again', () => {
    expect(toggleTarget(33, 100)).toBe(100);
    expect(toggleTarget(100, 100)).toBeNull();
    expect(toggleTarget(null, 33)).toBe(33);
  });

  it('tells the chips from a custom target', () => {
    expect(isPresetTarget(33)).toBe(true);
    expect(isPresetTarget(100)).toBe(true);
    expect(isPresetTarget(250)).toBe(false);
    expect(isPresetTarget(null)).toBe(false);
  });
});
