import { eventsFixture, placesFixture, regionLevelFixture } from '../fixtures';
import type { SeerahMapLevel } from '../types';
import { eventsOfPin, mapTargetForPlace, otherEvents, sortByAge } from './map-target';

const makkahLevel: SeerahMapLevel = {
  ...regionLevelFixture,
  id: 'makkah',
  parentPlaceId: 'makkah',
  positions: [{ placeId: 'makkah.kaaba', x: 1, y: 1, labelPriority: 1, labelSide: 'end' }],
};
const levels = [regionLevelFixture, makkahLevel];

describe('mapTargetForPlace', () => {
  it('prefers the city map for a landmark', () => {
    expect(mapTargetForPlace(levels, placesFixture, 'makkah.kaaba')).toEqual({ levelId: 'makkah', pinPlaceId: 'makkah.kaaba' });
  });

  it('falls back to the nearest drawn ancestor on the region', () => {
    expect(mapTargetForPlace(levels, placesFixture, 'makkah.arqam')).toEqual({ levelId: 'region', pinPlaceId: 'makkah' });
    expect(mapTargetForPlace(levels, placesFixture, 'badr')).toEqual({ levelId: 'region', pinPlaceId: 'badr' });
  });

  it('has no target for «أخرى» or an unknown place', () => {
    expect(mapTargetForPlace(levels, placesFixture, 'other')).toBeNull();
    expect(mapTargetForPlace(levels, placesFixture, 'nowhere')).toBeNull();
  });
});

describe('eventsOfPin', () => {
  it('rolls the subtree up to the pin, in book order', () => {
    const events = eventsOfPin({ events: eventsFixture, focus: null, level: regionLevelFixture, placeId: 'makkah', places: placesFixture });
    expect(events.map((event) => event.id)).toEqual(['e001', 'e002', 'e003', 'e004']);
  });

  it('keeps only the focused events when some match, else all', () => {
    const base = { events: eventsFixture, level: regionLevelFixture, placeId: 'makkah', places: placesFixture };
    expect(eventsOfPin({ ...base, focus: 43 }).map((event) => event.id)).toEqual(['e003', 'e004']);
    expect(eventsOfPin({ ...base, focus: 10 }).map((event) => event.id)).toEqual(['e001', 'e002', 'e003', 'e004']);
  });

  it('leaves background events and «أخرى» out', () => {
    const events = eventsOfPin({ events: eventsFixture, focus: null, level: regionLevelFixture, placeId: 'madinah', places: placesFixture });
    expect(events.map((event) => event.id)).toEqual(['e005', 'e008', 'e010']);
  });
});

describe('otherEvents and sortByAge', () => {
  it('lists the «أخرى» events matching the focus', () => {
    expect(otherEvents(eventsFixture, null).map((event) => event.id)).toEqual(['e007']);
    expect(otherEvents(eventsFixture, 54).map((event) => event.id)).toEqual(['e007']);
    expect(otherEvents(eventsFixture, 10)).toEqual([]);
  });

  it('sorts by age with the unspecified last', () => {
    expect(sortByAge([eventsFixture[7]!, eventsFixture[4]!, eventsFixture[0]!]).map((event) => event.id)).toEqual(['e001', 'e005', 'e008']);
  });
});
