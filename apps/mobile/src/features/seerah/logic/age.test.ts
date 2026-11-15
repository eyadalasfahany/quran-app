import { AGE_MAX, AGE_MIN, LIFE_STAGES, ageSpanOf, clampAge, eraOfAge, isAge, stageByKey, stageOfAge } from './age';

describe('stageOfAge', () => {
  it.each([
    [0, 'childhood'],
    [11, 'childhood'],
    [12, 'adolescence'],
    [19, 'adolescence'],
    [20, 'youth'],
    [39, 'youth'],
    [40, 'maturity'],
    [63, 'maturity'],
  ])('age %i is %s', (age, key) => {
    expect(stageOfAge(age)?.key).toBe(key);
  });

  it.each([-1, 64, 1.5, Number.NaN])('has no stage for %p', (age) => {
    expect(stageOfAge(age)).toBeNull();
  });

  it('the four stages tile 0..63 with no gap', () => {
    expect(LIFE_STAGES[0]?.from).toBe(AGE_MIN);
    expect(LIFE_STAGES.at(-1)?.to).toBe(AGE_MAX);
    LIFE_STAGES.slice(1).forEach((stage, index) => expect(stage.from).toBe((LIFE_STAGES[index]?.to ?? 0) + 1));
  });

  it('finds a stage by key', () => {
    expect(stageByKey('youth')).toEqual({ key: 'youth', from: 20, to: 39 });
  });
});

describe('eraOfAge', () => {
  it.each([
    [0, { era: 'bh', year: 53 }],
    [40, { era: 'bh', year: 13 }],
    [52, { era: 'bh', year: 1 }],
    [53, { era: 'ah', year: 1 }],
    [54, { era: 'ah', year: 2 }],
    [63, { era: 'ah', year: 11 }],
  ])('age %i', (age, expected) => {
    expect(eraOfAge(age)).toEqual(expected);
  });

  it('is null outside 0..63', () => {
    expect(eraOfAge(64)).toBeNull();
    expect(eraOfAge(-1)).toBeNull();
  });
});

describe('helpers', () => {
  it('isAge accepts whole numbers 0..63 only', () => {
    expect([0, 63].every(isAge)).toBe(true);
    expect([-1, 64, 2.5, '5', null].some(isAge)).toBe(false);
  });

  it('clampAge rounds and clamps', () => {
    expect(clampAge(-5)).toBe(0);
    expect(clampAge(70)).toBe(63);
    expect(clampAge(12.4)).toBe(12);
  });

  it('ageSpanOf returns null for the unspecified bucket and a single age as a one-year span', () => {
    expect(ageSpanOf({ ageFrom: null, ageTo: null })).toBeNull();
    expect(ageSpanOf({ ageFrom: 5, ageTo: null })).toEqual({ from: 5, to: 5 });
    expect(ageSpanOf({ ageFrom: 5, ageTo: 7 })).toEqual({ from: 5, to: 7 });
  });
});
