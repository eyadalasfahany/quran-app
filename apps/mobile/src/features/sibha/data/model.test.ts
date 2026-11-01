import {
  countTap,
  DEFAULT_SIBHA_STATE,
  isPresetTarget,
  parseSibhaNumber,
  parseSibhaState,
  resetCount,
  todayTotalFor,
  toggleTarget,
  withTarget,
} from './model';

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
  it('returns the default for a missing value, with no rounds', () => {
    expect(parseSibhaState(undefined)).toEqual(DEFAULT_SIBHA_STATE);
    expect(DEFAULT_SIBHA_STATE.rounds).toBe(0);
  });

  it('returns the default for a value that is not JSON', () => {
    expect(parseSibhaState('{nope')).toEqual(DEFAULT_SIBHA_STATE);
  });

  it('keeps each valid field, rounds included, and defaults the others', () => {
    expect(parseSibhaState(JSON.stringify({ count: 12, label: 'تسمية تجريبية', rounds: 3, target: 99 }))).toEqual({
      count: 12,
      label: 'تسمية تجريبية',
      rounds: 3,
      target: 99,
    });
    expect(parseSibhaState(JSON.stringify({ count: -4, label: 7, rounds: -1, target: 'x' }))).toEqual({
      count: 0,
      label: '',
      rounds: 0,
      target: DEFAULT_SIBHA_STATE.target,
    });
  });

  it('defaults rounds for a value saved before rounds existed', () => {
    expect(parseSibhaState(JSON.stringify({ count: 5, label: '', target: 33 }))).toEqual({
      count: 5,
      label: '',
      rounds: 0,
      target: 33,
    });
  });

  it('keeps an explicit null target (no limit) and cuts a long label', () => {
    const parsed = parseSibhaState(JSON.stringify({ count: 1, label: 'x'.repeat(60), rounds: 0, target: null }));
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
  it('adds one and never caps the count when there is no target', () => {
    const result = countTap({ count: 4, label: '', rounds: 0, target: null });
    expect(result).toEqual({ reachedTarget: false, state: { count: 5, label: '', rounds: 0, target: null } });
  });

  it('keeps growing past any number with no target, and never completes a round', () => {
    let state = { count: 0, label: '', rounds: 0, target: null as number | null };
    for (let i = 0; i < 10_000; i += 1) {
      const result = countTap(state);
      expect(result.reachedTarget).toBe(false);
      state = result.state;
    }
    expect(state).toMatchObject({ count: 10_000, rounds: 0 });
  });

  it('completes a round on the tap that reaches the target: the count goes back to zero and rounds go up', () => {
    expect(countTap({ count: 97, label: '', rounds: 0, target: 99 })).toEqual({
      reachedTarget: false,
      state: { count: 98, label: '', rounds: 0, target: 99 },
    });
    expect(countTap({ count: 98, label: '', rounds: 0, target: 99 })).toEqual({
      reachedTarget: true,
      state: { count: 0, label: '', rounds: 1, target: 99 },
    });
  });

  it('counts a second round from zero, with the rounds going up again', () => {
    let state = { count: 0, label: '', rounds: 0, target: 2 as number | null };
    const reached: boolean[] = [];
    for (let i = 0; i < 4; i += 1) {
      const result = countTap(state);
      reached.push(result.reachedTarget);
      state = result.state;
    }
    expect(reached).toEqual([false, true, false, true]);
    expect(state).toMatchObject({ count: 0, rounds: 2 });
  });

  it('completes a round on the next tap when a lowered target is already passed', () => {
    expect(countTap({ count: 40, label: '', rounds: 0, target: 33 })).toMatchObject({
      reachedTarget: true,
      state: { count: 0, rounds: 1 },
    });
  });
});

describe('withTarget and resetCount', () => {
  it('starts the rounds again on any target change, and keeps the count', () => {
    expect(withTarget({ count: 7, label: 'x', rounds: 3, target: 33 }, 99)).toEqual({
      count: 7,
      label: 'x',
      rounds: 0,
      target: 99,
    });
  });

  it('clears the rounds when the target becomes no limit', () => {
    expect(withTarget({ count: 7, label: '', rounds: 3, target: 33 }, null)).toMatchObject({ rounds: 0, target: null });
  });

  it('clears the count and the rounds, and keeps the target and label', () => {
    expect(resetCount({ count: 12, label: 'x', rounds: 2, target: 33 })).toEqual({
      count: 0,
      label: 'x',
      rounds: 0,
      target: 33,
    });
  });
});

describe('toggleTarget and isPresetTarget', () => {
  it('sets a target, and clears it (to no limit) when the active chip is pressed again', () => {
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
