import { eventsFixture, milestonesFixture } from '../fixtures';
import { ageToFraction, fractionToAge, histogramHeights, milestoneMarks, stageBands, stepFocus } from './timeline';

describe('axis maths', () => {
  it('maps an age to the middle of its tick and back', () => {
    for (let age = 0; age <= 63; age += 1) {
      expect(fractionToAge(ageToFraction(age))).toBe(age);
    }
  });

  it.each([
    [-0.5, 0],
    [0, 0],
    [0.999, 63],
    [1, 63],
    [2, 63],
    [0.5, 32],
  ])('fraction %p is age %i', (fraction, age) => {
    expect(fractionToAge(fraction)).toBe(age);
  });

  it('stage bands tile the axis', () => {
    const bands = stageBands();
    expect(bands.map((band) => band.key)).toEqual(['childhood', 'adolescence', 'youth', 'maturity']);
    expect(bands[0]?.start).toBe(0);
    const end = bands.at(-1);
    expect((end?.start ?? 0) + (end?.size ?? 0)).toBeCloseTo(1);
    expect(bands[0]?.size).toBeCloseTo(12 / 64);
  });
});

describe('stepFocus', () => {
  it.each([
    [null, 1, 0],
    [null, -1, 63],
    ['unspecified', 1, 0],
    [10, 1, 11],
    [10, -1, 9],
    [63, 1, 63],
    [0, -1, 0],
  ] as const)('from %p by %i gives %p', (focus, direction, expected) => {
    expect(stepFocus(focus, direction)).toBe(expected);
  });
});

describe('milestoneMarks', () => {
  it('reads each age from its event and sorts by age', () => {
    expect(milestoneMarks(milestonesFixture, eventsFixture).map((mark) => [mark.key, mark.age])).toEqual([
      ['birth', 0],
      ['hijra', 53],
      ['death', 63],
    ]);
  });

  it('drops a milestone whose event is missing or has no age', () => {
    expect(milestoneMarks([{ key: 'x', labelAr: 'س', eventId: 'none' }], eventsFixture)).toEqual([]);
    expect(milestoneMarks([{ key: 'x', labelAr: 'س', eventId: 'e008' }], eventsFixture)).toEqual([]);
  });
});

describe('histogramHeights', () => {
  it('scales to the tallest year', () => {
    expect(histogramHeights([0, 2, 4])).toEqual([0, 0.5, 1]);
    expect(histogramHeights([0, 0])).toEqual([0, 0]);
  });
});
