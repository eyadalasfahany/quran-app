import type {
  SeerahEvent,
  SeerahMapLevel,
  SeerahMapPin,
  SeerahMilestone,
  SeerahParagraph,
  SeerahPlace,
} from './types';

// Test and review fixtures. Every text is a marked placeholder, never the book's words.

export const FIXTURE_TITLE = '[عنوان الفصل في الكتاب]';
export const FIXTURE_PARAGRAPH = '[نص الكتاب: فقرة — نص تجريبي للعرض فقط، ليس من الكتاب]';

export const placesFixture: SeerahPlace[] = [
  { id: 'hijaz', parentId: null, kind: 'region', nameAr: 'الحجاز', nameEn: null },
  { id: 'makkah', parentId: 'hijaz', kind: 'city', nameAr: 'مكة', nameEn: null },
  { id: 'makkah.kaaba', parentId: 'makkah', kind: 'landmark', nameAr: 'الكعبة', nameEn: null },
  { id: 'makkah.arqam', parentId: 'makkah', kind: 'landmark', nameAr: 'دار الأرقم', nameEn: null },
  { id: 'madinah', parentId: 'hijaz', kind: 'city', nameAr: 'المدينة', nameEn: null },
  { id: 'badr', parentId: 'hijaz', kind: 'city', nameAr: 'بدر', nameEn: null },
  { id: 'other', parentId: null, kind: 'region', nameAr: 'أخرى', nameEn: null },
];

export function makeEvent(overrides: Partial<SeerahEvent> & Pick<SeerahEvent, 'id' | 'position'>): SeerahEvent {
  return {
    sectionId: `s${overrides.id}`,
    titleAr: FIXTURE_TITLE,
    kind: 'event',
    placeId: 'makkah',
    placeBasis: 'stated',
    alsoPlaceIds: [],
    ageFrom: 40,
    ageTo: 40,
    era: 'bh',
    hijriFrom: 13,
    hijriTo: 13,
    yearBasis: 'stated_age',
    certainty: 'stated',
    routeId: null,
    flags: [],
    ...overrides,
  };
}

export const eventsFixture: SeerahEvent[] = [
  makeEvent({ id: 'e001', position: 1, placeId: 'makkah', ageFrom: 0, ageTo: 0 }),
  makeEvent({ id: 'e002', position: 2, placeId: 'makkah.kaaba', ageFrom: 35, ageTo: 35 }),
  makeEvent({ id: 'e003', position: 3, placeId: 'makkah.arqam', ageFrom: 43, ageTo: 43 }),
  makeEvent({ id: 'e004', position: 4, placeId: 'makkah.arqam', ageFrom: 43, ageTo: 44, certainty: 'approximate' }),
  makeEvent({ id: 'e005', position: 5, placeId: 'madinah', ageFrom: 53, ageTo: 53 }),
  makeEvent({ id: 'e006', position: 6, placeId: 'badr', ageFrom: 54, ageTo: 54 }),
  makeEvent({ id: 'e007', position: 7, placeId: 'other', placeBasis: 'unstated', ageFrom: 54, ageTo: 54, flags: ['place_not_stated'] }),
  makeEvent({
    id: 'e008',
    position: 8,
    placeId: 'madinah',
    ageFrom: null,
    ageTo: null,
    era: null,
    hijriFrom: null,
    hijriTo: null,
    yearBasis: 'unspecified',
    certainty: 'unspecified',
    flags: ['year_not_stated'],
  }),
  makeEvent({ id: 'e009', position: 9, placeId: 'madinah', ageFrom: 63, ageTo: 63, kind: 'background' }),
  makeEvent({ id: 'e010', position: 10, placeId: 'madinah', ageFrom: 63, ageTo: 63 }),
];

export const milestonesFixture: SeerahMilestone[] = [
  { key: 'death', labelAr: 'الوفاة', eventId: 'e010' },
  { key: 'birth', labelAr: 'المولد', eventId: 'e001' },
  { key: 'hijra', labelAr: 'الهجرة', eventId: 'e005' },
];

export const regionLevelFixture: SeerahMapLevel = {
  id: 'region',
  parentPlaceId: null,
  viewbox: [0, 0, 1644, 2400],
  zoom: { min: 0.32, default: 0.6, max: 2.4, cityThreshold: 1.8, fanOut: null },
  positions: [
    { placeId: 'makkah', x: 897.7, y: 1357.8, labelPriority: 100, labelSide: 'end' },
    { placeId: 'madinah', x: 878, y: 1053.3, labelPriority: 100, labelSide: 'end' },
    { placeId: 'badr', x: 803, y: 1122, labelPriority: 80, labelSide: 'start' },
  ],
  routePaths: [{ routeId: 'r-hijra', kind: 'hijra', d: 'M897.7,1357.8 C830,1260 860,1100 878,1053.3' }],
  areaLabels: [{ id: 'area.hijaz', nameAr: 'الحجاز', x: 758.2, y: 710, rotate: -50 }],
};

export function makePin(overrides: Partial<SeerahMapPin> & Pick<SeerahMapPin, 'placeId'>): SeerahMapPin {
  return {
    x: 100,
    y: 100,
    kind: 'city',
    count: 3,
    name: 'مكة',
    eventTitle: null,
    ageMin: 40,
    ageMax: 50,
    labelPriority: 50,
    labelSide: 'end',
    order: 1,
    dimmed: false,
    uncertain: false,
    opensLevel: null,
    ...overrides,
  };
}

export const paragraphsFixture: SeerahParagraph[] = [
  { id: 'p00001', position: 1, page: 123, text: `${FIXTURE_PARAGRAPH} ١` },
  { id: 'p00002', position: 2, page: 123, text: `${FIXTURE_PARAGRAPH} ٢` },
];
