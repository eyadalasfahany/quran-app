// Plain data objects the Seerah components take. They mirror the data model in docs/plans/phase-8/data-format.md
// (and the MySQL tables of phase-8.md), in camelCase. The data layer (step 28) maps its rows to these; nothing here
// reads a database. Arabic text (titles, place names, paragraphs) is the book's own and is shown as it is stored.

export type SeerahPlaceKind = 'region' | 'city' | 'landmark';

export type SeerahPlace = {
  id: string;
  parentId: string | null;
  kind: SeerahPlaceKind;
  nameAr: string;
  /** Null until the developer answers Q19; the UI shows `nameAr` in both languages. */
  nameEn: string | null;
};

export type SeerahEra = 'bh' | 'ah';

export type SeerahCertainty = 'stated' | 'approximate' | 'developer_assigned' | 'unspecified';

export type SeerahYearBasis =
  | 'stated_age'
  | 'stated_hijri'
  | 'stated_relative'
  | 'section_year'
  | 'implied'
  | 'unstated'
  | 'unspecified';

export type SeerahPlaceBasis = 'stated' | 'implied' | 'unstated';

export type SeerahEventKind = 'event' | 'background';

/** The place id of the «أخرى» bucket: events whose place the book does not state. It has no map position. */
export const OTHER_PLACE_ID = 'other';

export type SeerahEvent = {
  id: string;
  sectionId: string;
  /** The book's heading, exactly. */
  titleAr: string;
  kind: SeerahEventKind;
  placeId: string;
  placeBasis: SeerahPlaceBasis;
  /** Other places named in the span; shown on the event page, not pinned. */
  alsoPlaceIds: string[];
  /** Null in the «غير محدد» year bucket. */
  ageFrom: number | null;
  ageTo: number | null;
  era: SeerahEra | null;
  hijriFrom: number | null;
  hijriTo: number | null;
  yearBasis: SeerahYearBasis;
  certainty: SeerahCertainty;
  /** Book order, 1-based. Previous and next follow it. */
  position: number;
  routeId: string | null;
  /** Flag codes, for example `place_not_stated`, `year_not_stated`. */
  flags: string[];
};

export type SeerahParagraph = {
  id: string;
  position: number;
  page: number | null;
  text: string;
};

export type SeerahRouteKind = 'trip' | 'hijra' | 'taif' | 'ghazwa' | 'habasha';

export type SeerahRoute = {
  id: string;
  kind: SeerahRouteKind;
  nameAr: string;
  stops: string[];
  eventIds: string[];
};

export type SeerahRoutePath = {
  routeId: string;
  kind: SeerahRouteKind;
  /** SVG path data in the level's viewbox units. */
  d: string;
};

export type SeerahMilestone = {
  /** `birth`, `bitha`, `hijra`, `badr`, `fath` or `death`. */
  key: string;
  labelAr: string;
  eventId: string;
};

/** The side of its pin a label is drawn on, in screen terms: the map is never mirrored, so `end` is always the right. */
export type SeerahLabelSide = 'start' | 'end';

export type SeerahMapPosition = {
  placeId: string;
  x: number;
  y: number;
  labelPriority: number;
  labelSide: SeerahLabelSide;
};

export type SeerahMapZoom = {
  min: number;
  default: number;
  max: number;
  /** Region level: the scale at which a city opens its own map. Null for city levels. */
  cityThreshold: number | null;
  /** City level: the scale at which a spot's events fan out on a ring. Null for the region. */
  fanOut: number | null;
};

export type SeerahAreaLabel = { id: string; nameAr: string; x: number; y: number; rotate: number };

export type SeerahMapLevel = {
  /** `region`, `makkah` or `madinah`. */
  id: string;
  parentPlaceId: string | null;
  viewbox: [number, number, number, number];
  zoom: SeerahMapZoom;
  positions: SeerahMapPosition[];
  routePaths: SeerahRoutePath[];
  areaLabels: SeerahAreaLabel[];
};

/** What the timeline and map focus on: every age (`null`), one age 0..63, or the «غير محدد» bucket. */
export type SeerahFocus = number | 'unspecified' | null;

export type SeerahPinKind = 'city' | 'landmark' | 'region';

/** One pin as a screen hands it to SeerahMap, after the roll-up (see logic/places.ts `buildMapPins`). */
export type SeerahMapPin = {
  placeId: string;
  x: number;
  y: number;
  kind: SeerahPinKind;
  /** Events at the place and under it that match the focus (all of them when none does). 0: a place without events. */
  count: number;
  name: string;
  /** A place with exactly one event labels the pin with the event's title. */
  eventTitle: string | null;
  ageMin: number | null;
  ageMax: number | null;
  labelPriority: number;
  labelSide: SeerahLabelSide;
  /** Book order of the place's first event, the last label tie-break. */
  order: number;
  dimmed: boolean;
  /** An event with `approximate` or `developer_assigned` certainty: the dashed edge. */
  uncertain: boolean;
  /** A city with its own map: the level id it opens. */
  opensLevel: string | null;
};
