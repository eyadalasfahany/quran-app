import type { SeerahEvent, SeerahFocus, SeerahMapLevel, SeerahMapPin, SeerahPinKind, SeerahPlace } from '../types';
import { OTHER_PLACE_ID } from '../types';
import { eventMatchesFocus } from './focus';

export type PlaceTree = {
  byId: Map<string, SeerahPlace>;
  children: Map<string, string[]>;
};

export function buildPlaceTree(places: readonly SeerahPlace[]): PlaceTree {
  const byId = new Map(places.map((place) => [place.id, place]));
  const children = new Map<string, string[]>();
  for (const place of places) {
    if (place.parentId !== null) {
      children.set(place.parentId, [...(children.get(place.parentId) ?? []), place.id]);
    }
  }
  return { byId, children };
}

/** The place and every place under it. Guards against a cycle in bad data. */
export function subtreeIds(tree: PlaceTree, rootId: string): string[] {
  const seen = new Set<string>();
  const stack = [rootId];
  while (stack.length > 0) {
    const id = stack.pop() as string;
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    stack.push(...(tree.children.get(id) ?? []));
  }
  return [...seen];
}

/** The place and its parents up to the root, nearest first. */
export function ancestorIds(tree: PlaceTree, placeId: string): string[] {
  const chain: string[] = [];
  let current: string | null | undefined = placeId;
  while (current !== null && current !== undefined && !chain.includes(current)) {
    chain.push(current);
    current = tree.byId.get(current)?.parentId;
  }
  return chain;
}

/** Events that a map shows: «background» events have no pin. */
export function pinnableEvents(events: readonly SeerahEvent[]): SeerahEvent[] {
  return events.filter((event) => event.kind === 'event');
}

/**
 * Roll-up counts: each place's count is its own events plus every event in its subtree, so a city's pin on the region
 * map counts everything below it. Pass events already filtered by the focus to count the focused ones.
 */
export function rollUpCounts(tree: PlaceTree, events: readonly SeerahEvent[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const event of events) {
    for (const id of ancestorIds(tree, event.placeId)) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return counts;
}

/** The nearest place, from the event's own place upward, that has a drawn position on this level. */
export function pinPlaceFor(tree: PlaceTree, placeId: string, positioned: ReadonlySet<string>): string | null {
  return ancestorIds(tree, placeId).find((id) => positioned.has(id)) ?? null;
}

const PIN_KIND: Record<string, SeerahPinKind> = { region: 'region', city: 'city', landmark: 'landmark' };

export type BuildPinsInput = {
  level: SeerahMapLevel;
  places: readonly SeerahPlace[];
  events: readonly SeerahEvent[];
  focus: SeerahFocus;
  /** Opens a city map: place id → level id. */
  cityLevels?: Readonly<Record<string, string>>;
  placeName?: (place: SeerahPlace) => string;
};

/**
 * One pin per drawn place on a level, rolled up by the place tree. With a focus the count is the focused events; a
 * place whose events all fall outside the focus keeps its total and is dimmed. The «أخرى» place has no pin
 * (SeerahMap draws it as an edge chip; see `otherCount`).
 */
export function buildMapPins(input: BuildPinsInput): SeerahMapPin[] {
  const tree = buildPlaceTree(input.places);
  const positioned = new Set(input.level.positions.map((position) => position.placeId));
  const events = pinnableEvents(input.events).filter((event) => event.placeId !== OTHER_PLACE_ID);
  const owned = new Map<string, SeerahEvent[]>();
  for (const event of events) {
    const pinId = pinPlaceFor(tree, event.placeId, positioned);
    if (pinId !== null) {
      owned.set(pinId, [...(owned.get(pinId) ?? []), event]);
    }
  }
  const name = input.placeName ?? ((place: SeerahPlace) => place.nameAr);
  const pins: SeerahMapPin[] = [];
  for (const position of input.level.positions) {
    const place = tree.byId.get(position.placeId);
    const own = owned.get(position.placeId) ?? [];
    if (place === undefined) {
      continue;
    }
    const focused = own.filter((event) => eventMatchesFocus(event, input.focus));
    const shown = focused.length > 0 ? focused : own;
    const ages = shown.flatMap((event) => (event.ageFrom === null ? [] : [event.ageFrom, event.ageTo ?? event.ageFrom]));
    pins.push({
      placeId: place.id,
      x: position.x,
      y: position.y,
      kind: PIN_KIND[place.kind] ?? 'landmark',
      count: shown.length,
      name: name(place),
      eventTitle: shown.length === 1 ? (shown[0]?.titleAr ?? null) : null,
      ageMin: ages.length > 0 ? Math.min(...ages) : null,
      ageMax: ages.length > 0 ? Math.max(...ages) : null,
      labelPriority: position.labelPriority,
      labelSide: position.labelSide,
      order: shown.length > 0 ? Math.min(...shown.map((event) => event.position)) : Number.MAX_SAFE_INTEGER,
      dimmed: input.focus !== null && own.length > 0 && focused.length === 0,
      uncertain: shown.some((event) => event.certainty === 'approximate' || event.certainty === 'developer_assigned'),
      opensLevel: input.cityLevels?.[place.id] ?? null,
    });
  }
  return pins;
}

/** Events in the «أخرى» bucket that match the focus. */
export function otherCount(events: readonly SeerahEvent[], focus: SeerahFocus): number {
  return pinnableEvents(events).filter((event) => event.placeId === OTHER_PLACE_ID && eventMatchesFocus(event, focus))
    .length;
}
