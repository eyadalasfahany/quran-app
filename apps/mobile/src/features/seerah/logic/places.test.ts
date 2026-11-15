import { eventsFixture, makeEvent, placesFixture, regionLevelFixture } from '../fixtures';
import {
  ancestorIds,
  buildMapPins,
  buildPlaceTree,
  otherCount,
  pinPlaceFor,
  pinnableEvents,
  rollUpCounts,
  subtreeIds,
} from './places';

const tree = buildPlaceTree(placesFixture);

describe('place tree', () => {
  it('lists a subtree', () => {
    expect(subtreeIds(tree, 'makkah').sort()).toEqual(['makkah', 'makkah.arqam', 'makkah.kaaba']);
    expect(subtreeIds(tree, 'badr')).toEqual(['badr']);
  });

  it('lists ancestors nearest first', () => {
    expect(ancestorIds(tree, 'makkah.arqam')).toEqual(['makkah.arqam', 'makkah', 'hijaz']);
  });

  it('survives a cycle in bad data', () => {
    const cyclic = buildPlaceTree([
      { id: 'a', parentId: 'b', kind: 'city', nameAr: 'أ', nameEn: null },
      { id: 'b', parentId: 'a', kind: 'city', nameAr: 'ب', nameEn: null },
    ]);
    expect(ancestorIds(cyclic, 'a')).toEqual(['a', 'b']);
    expect(subtreeIds(cyclic, 'a').sort()).toEqual(['a', 'b']);
  });
});

describe('rollUpCounts', () => {
  const counts = rollUpCounts(tree, pinnableEvents(eventsFixture));

  it('a city counts its whole subtree', () => {
    const own = pinnableEvents(eventsFixture).filter((event) => event.placeId === 'makkah').length;
    const below = pinnableEvents(eventsFixture).filter((event) => event.placeId.startsWith('makkah.')).length;
    expect(counts.get('makkah')).toBe(own + below);
    expect(counts.get('makkah')).toBe(4);
  });

  it('a parent equals the sum of its children plus its own', () => {
    const sum = ['makkah', 'madinah', 'badr'].reduce((total, id) => total + (counts.get(id) ?? 0), 0);
    expect(counts.get('hijaz')).toBe(sum);
  });

  it('background events are not counted', () => {
    expect(counts.get('madinah')).toBe(3);
  });
});

describe('pinPlaceFor', () => {
  it('goes up to the nearest drawn place', () => {
    expect(pinPlaceFor(tree, 'makkah.kaaba', new Set(['makkah', 'madinah']))).toBe('makkah');
    expect(pinPlaceFor(tree, 'makkah.kaaba', new Set(['makkah.kaaba', 'makkah']))).toBe('makkah.kaaba');
    expect(pinPlaceFor(tree, 'badr', new Set(['makkah']))).toBeNull();
  });
});

describe('buildMapPins', () => {
  const pinsFor = (focus: Parameters<typeof buildMapPins>[0]['focus']) =>
    buildMapPins({ level: regionLevelFixture, places: placesFixture, events: eventsFixture, focus, cityLevels: { makkah: 'makkah' } });
  const byId = (pins: ReturnType<typeof pinsFor>, id: string) => pins.find((pin) => pin.placeId === id);

  it('rolls landmarks up into the city and keeps the «أخرى» events off the map', () => {
    const pins = pinsFor(null);
    expect(byId(pins, 'makkah')?.count).toBe(4);
    expect(byId(pins, 'makkah')?.opensLevel).toBe('makkah');
    expect(byId(pins, 'madinah')?.count).toBe(3);
    expect(pins.some((pin) => pin.placeId === 'other')).toBe(false);
  });

  it('labels a single-event place with the event title', () => {
    const pin = byId(pinsFor(null), 'badr');
    expect(pin?.eventTitle).toBe(eventsFixture.find((event) => event.id === 'e006')?.titleAr);
    expect(byId(pinsFor(null), 'makkah')?.eventTitle).toBeNull();
  });

  it('with a focus, counts the focused events and dims the rest', () => {
    const pins = pinsFor(43);
    expect(byId(pins, 'makkah')?.count).toBe(2);
    expect(byId(pins, 'makkah')?.dimmed).toBe(false);
    expect(byId(pins, 'madinah')?.dimmed).toBe(true);
    expect(byId(pins, 'madinah')?.count).toBe(3);
  });

  it('marks approximate certainty and reports the age range', () => {
    const pin = byId(pinsFor(43), 'makkah');
    expect(pin?.uncertain).toBe(true);
    expect([pin?.ageMin, pin?.ageMax]).toEqual([43, 44]);
  });

  it('leaves a place with no events as an empty pin', () => {
    const pins = buildMapPins({ level: regionLevelFixture, places: placesFixture, events: [], focus: null });
    expect(pins).toHaveLength(3);
    expect(pins.every((pin) => pin.count === 0 && !pin.dimmed && pin.ageMin === null)).toBe(true);
  });

  it('orders a pin by its first event and ignores events of other levels', () => {
    const pins = buildMapPins({
      level: regionLevelFixture,
      places: placesFixture,
      events: [makeEvent({ id: 'z', position: 9, placeId: 'hijaz' })],
      focus: null,
    });
    expect(pins.every((pin) => pin.count === 0)).toBe(true);
  });
});

describe('otherCount', () => {
  it('counts the «أخرى» events that match the focus', () => {
    expect(otherCount(eventsFixture, null)).toBe(1);
    expect(otherCount(eventsFixture, 54)).toBe(1);
    expect(otherCount(eventsFixture, 40)).toBe(0);
  });
});
