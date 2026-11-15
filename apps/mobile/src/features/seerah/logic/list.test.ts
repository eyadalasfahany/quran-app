import { eventsFixture, makeEvent } from '../fixtures';
import { groupEventsForList, neighbours } from './list';

describe('groupEventsForList', () => {
  const groups = groupEventsForList(eventsFixture);

  it('groups by stage then age, in order', () => {
    expect(groups.stages.map((stage) => stage.stage)).toEqual(['childhood', 'youth', 'maturity']);
    const maturity = groups.stages.at(-1);
    expect(maturity?.ages.map((group) => group.age)).toEqual([43, 53, 54, 63]);
    expect(maturity?.from).toBe(40);
  });

  it('lists every event exactly once, spans under their first age', () => {
    const listed = [...groups.stages.flatMap((s) => s.ages.flatMap((a) => a.events)), ...groups.unspecified];
    expect(listed.map((event) => event.id).sort()).toEqual(eventsFixture.map((event) => event.id).sort());
    expect(groups.stages.at(-1)?.ages[0]?.events.map((event) => event.id)).toEqual(['e003', 'e004']);
  });

  it('puts the unspecified bucket apart, in book order', () => {
    expect(groups.unspecified.map((event) => event.id)).toEqual(['e008']);
  });

  it('is empty for no events', () => {
    expect(groupEventsForList([])).toEqual({ stages: [], unspecified: [] });
  });
});

describe('neighbours', () => {
  it('returns the previous and next in book order', () => {
    const result = neighbours(eventsFixture, 'e005');
    expect([result.previous?.id, result.next?.id, result.index, result.total]).toEqual(['e004', 'e006', 5, 10]);
  });

  it('has no previous at the start and no next at the end', () => {
    expect(neighbours(eventsFixture, 'e001').previous).toBeNull();
    expect(neighbours(eventsFixture, 'e010').next).toBeNull();
  });

  it('an unspecified event sits between its book neighbours', () => {
    const result = neighbours(eventsFixture, 'e008');
    expect([result.previous?.id, result.next?.id]).toEqual(['e007', 'e009']);
  });

  it('handles an unknown id and unsorted input', () => {
    expect(neighbours(eventsFixture, 'zzz')).toEqual({ previous: null, next: null, index: 0, total: 10 });
    const result = neighbours([makeEvent({ id: 'b', position: 2 }), makeEvent({ id: 'a', position: 1 })], 'b');
    expect(result.previous?.id).toBe('a');
  });
});
