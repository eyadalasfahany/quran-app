import type { SeerahEvent, SeerahFocus, SeerahMapLevel, SeerahPlace } from '../types';
import { OTHER_PLACE_ID } from '../types';
import { eventMatchesFocus } from './focus';
import { ancestorIds, buildPlaceTree, pinnableEvents, pinPlaceFor } from './places';

export type MapTarget = { levelId: string; pinPlaceId: string };

/**
 * Where a place is drawn: the nearest place, from the event's own upward, that has a position, preferring a city map to the
 * region (a landmark sits on its city's map). Null for a place with no drawn position at all («أخرى»).
 */
export function mapTargetForPlace(levels: readonly SeerahMapLevel[], places: readonly SeerahPlace[], placeId: string): MapTarget | null {
  if (placeId === OTHER_PLACE_ID) {
    return null;
  }
  const tree = buildPlaceTree(places);
  const chain = ancestorIds(tree, placeId);
  const ordered = [...levels].sort((a, b) => Number(a.id === 'region') - Number(b.id === 'region'));
  for (const level of ordered) {
    const positioned = new Set(level.positions.map((position) => position.placeId));
    const found = chain.find((id) => positioned.has(id));
    if (found !== undefined) {
      return { levelId: level.id, pinPlaceId: found };
    }
  }
  return null;
}

/**
 * The events a pin stands for on a level, as `buildMapPins` counts them: the events owned by the pin place (its own and
 * everything below that has no pin of its own), those in the focus when any are, otherwise all of them. In book order.
 */
export function eventsOfPin(input: {
  level: SeerahMapLevel;
  places: readonly SeerahPlace[];
  events: readonly SeerahEvent[];
  focus: SeerahFocus;
  placeId: string;
}): SeerahEvent[] {
  const tree = buildPlaceTree(input.places);
  const positioned = new Set(input.level.positions.map((position) => position.placeId));
  const own = pinnableEvents(input.events)
    .filter((event) => event.placeId !== OTHER_PLACE_ID && pinPlaceFor(tree, event.placeId, positioned) === input.placeId)
    .sort((a, b) => a.position - b.position);
  const focused = own.filter((event) => eventMatchesFocus(event, input.focus));
  return focused.length > 0 ? focused : own;
}

/** The events in the «أخرى» bucket that match the focus (all with no focus), in book order. */
export function otherEvents(events: readonly SeerahEvent[], focus: SeerahFocus): SeerahEvent[] {
  return pinnableEvents(events)
    .filter((event) => event.placeId === OTHER_PLACE_ID && eventMatchesFocus(event, focus))
    .sort((a, b) => a.position - b.position);
}

/** Events by age for a spot sheet: ages ascending, the «غير محدد» ones last, ties in book order. */
export function sortByAge(events: readonly SeerahEvent[]): SeerahEvent[] {
  return [...events].sort((a, b) => (a.ageFrom ?? Infinity) - (b.ageFrom ?? Infinity) || a.position - b.position);
}
