import { eventsFixture, makeEvent } from '../fixtures';
import { buildYearIndex, eventMatchesFocus, eventsOfFocus, focusEvents, isUnspecifiedEvent, nearestAgeWithEvents } from './focus';

describe('eventMatchesFocus', () => {
  const range = { ageFrom: 43, ageTo: 45 };
  const bucket = { ageFrom: null, ageTo: null };

  it.each([
    [range, null, true],
    [range, 42, false],
    [range, 43, true],
    [range, 44, true],
    [range, 45, true],
    [range, 46, false],
    [range, 'unspecified', false],
    [bucket, null, true],
    [bucket, 40, false],
    [bucket, 'unspecified', true],
    [{ ageFrom: 7, ageTo: 7 }, 7, true],
  ] as const)('%j with focus %p is %p', (event, focus, expected) => {
    expect(eventMatchesFocus(event, focus)).toBe(expected);
  });

  it('treats a missing ageTo as the first age', () => {
    expect(eventMatchesFocus({ ageFrom: 9, ageTo: null }, 9)).toBe(true);
    expect(eventMatchesFocus({ ageFrom: 9, ageTo: null }, 10)).toBe(false);
  });

  it('filters a list', () => {
    expect(focusEvents(eventsFixture, 43).map((event) => event.id)).toEqual(['e003', 'e004']);
    expect(focusEvents(eventsFixture, 'unspecified').map((event) => event.id)).toEqual(['e008']);
    expect(focusEvents(eventsFixture, null)).toHaveLength(eventsFixture.length);
  });

  it('flags the unspecified bucket', () => {
    expect(isUnspecifiedEvent({ ageFrom: null })).toBe(true);
    expect(isUnspecifiedEvent({ ageFrom: 0 })).toBe(false);
  });
});

describe('buildYearIndex', () => {
  const index = buildYearIndex(eventsFixture);

  it('lists an event in every year of its range, in book order', () => {
    expect(index.byAge[43]?.map((event) => event.id)).toEqual(['e003', 'e004']);
    expect(index.byAge[44]?.map((event) => event.id)).toEqual(['e004']);
  });

  it('has 64 years and counts them', () => {
    expect(index.byAge).toHaveLength(64);
    expect(index.counts[43]).toBe(2);
    expect(index.counts[1]).toBe(0);
    expect(index.total).toBe(eventsFixture.length);
  });

  it('keeps the unspecified bucket apart', () => {
    expect(index.unspecified.map((event) => event.id)).toEqual(['e008']);
    expect(index.unspecifiedCount).toBe(1);
    expect(index.counts.reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
  });

  it('orders by book position whatever the input order', () => {
    const shuffled = buildYearIndex([makeEvent({ id: 'b', position: 2, ageFrom: 5, ageTo: 5 }), makeEvent({ id: 'a', position: 1, ageFrom: 5, ageTo: 5 })]);
    expect(shuffled.byAge[5]?.map((event) => event.id)).toEqual(['a', 'b']);
  });

  it('clips a range past 63', () => {
    const clipped = buildYearIndex([makeEvent({ id: 'x', position: 1, ageFrom: 62, ageTo: 70 })]);
    expect(clipped.counts[63]).toBe(1);
    expect(clipped.counts).toHaveLength(64);
  });

  it('eventsOfFocus', () => {
    expect(eventsOfFocus(index, null)).toHaveLength(eventsFixture.length);
    expect(eventsOfFocus(index, 'unspecified')).toHaveLength(1);
    expect(eventsOfFocus(index, 35).map((event) => event.id)).toEqual(['e002']);
    expect(eventsOfFocus(index, 20)).toEqual([]);
  });

  it.each([
    [35, 35],
    [30, 35],
    [38, 35],
    [39, 35],
    [40, 43],
    [0, 0],
  ])('nearest age with events to %i is %i', (age, expected) => {
    expect(nearestAgeWithEvents(index, age)).toBe(expected);
  });

  it('has no nearest age when nothing has a year', () => {
    expect(nearestAgeWithEvents(buildYearIndex([]), 10)).toBeNull();
  });
});
