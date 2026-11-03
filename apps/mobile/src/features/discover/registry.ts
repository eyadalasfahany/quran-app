import type { Href } from 'expo-router';

import type { Destination } from '@/core/layout';
import type { ReaderMode } from '@/features/reader/anchor/reading-anchor';

// One list, in display order (ADR 0053). Adding a feature means one entry here, one markDiscovered call in that
// feature, and its strings in ar.json and en.json.

export const DISCOVER_GROUPS = ['reading', 'mine', 'listen', 'worship', 'app'] as const;
export type DiscoverGroup = (typeof DISCOVER_GROUPS)[number];

export const DISCOVER_IDS = [
  'reader.mushaf',
  'reader.reading',
  'reader.focus',
  'reader.tafsir',
  'my-quran',
  'listen.follow',
  'worship.salah',
  'worship.azkar',
  'worship.sibha',
  'worship.goals',
  'app.search',
  'app.settings',
  'app.widget',
] as const;
export type DiscoverId = (typeof DISCOVER_IDS)[number];

export type DiscoverOpen =
  /** An Expo Router route. */
  | { kind: 'route'; href: Href }
  /** A tab in the tab bar, resolved through the tab destinations. */
  | { kind: 'tab'; name: Destination['name'] }
  /** The Quran screen at the last-read place, switched to `mode` first when one is given. */
  | { kind: 'reader'; mode: ReaderMode | null }
  /** A sheet on the Discover screen itself. */
  | { kind: 'widget-sheet' };

// The row titles in ar.json and en.json under discover.rows. Typed so a missing string fails tsc.
export type DiscoverTitleKey =
  | 'discover.rows.readerMushaf'
  | 'discover.rows.readerReading'
  | 'discover.rows.readerFocus'
  | 'discover.rows.tafsir'
  | 'discover.rows.myQuran'
  | 'discover.rows.listenFollow'
  | 'discover.rows.salah'
  | 'discover.rows.azkar'
  | 'discover.rows.sibha'
  | 'discover.rows.goals'
  | 'discover.rows.search'
  | 'discover.rows.settings'
  | 'discover.rows.widget';

// Each step's tour line in ar.json and en.json, under discover.tour with the row's own suffix.
type DiscoverRowSuffix = DiscoverTitleKey extends `discover.rows.${infer Suffix}` ? Suffix : never;
export type DiscoverTourKey = `discover.tour.${DiscoverRowSuffix}`;

/** The tour line for a row: discover.rows.X → discover.tour.X. */
export function tourKeyFor(entry: Pick<DiscoverEntry, 'titleKey'>): DiscoverTourKey {
  return entry.titleKey.replace('discover.rows.', 'discover.tour.') as DiscoverTourKey;
}

export type DiscoverEntry = {
  id: DiscoverId;
  /** The app version that introduced the row. Recorded for the history; the logic uses ids only. */
  since: string;
  group: DiscoverGroup;
  titleKey: DiscoverTitleKey;
  open: DiscoverOpen;
  /**
   * How the tour step completes (ADR 0053, amended 3 Nov 2026). `action`: the feature's real action marks it done
   * (play, a count, a search), and its tip offers only «تخطي». `show`: the tip explains what is on screen, and
   * «التالي» marks it done.
   */
  step: 'action' | 'show';
};

const INITIAL_SINCE = '1.1.0';

export const DISCOVER_ENTRIES: readonly DiscoverEntry[] = [
  { id: 'reader.mushaf', since: INITIAL_SINCE, group: 'reading', titleKey: 'discover.rows.readerMushaf', open: { kind: 'reader', mode: 'mushaf' }, step: 'show' },
  { id: 'reader.reading', since: INITIAL_SINCE, group: 'reading', titleKey: 'discover.rows.readerReading', open: { kind: 'reader', mode: 'reading' }, step: 'show' },
  { id: 'reader.focus', since: INITIAL_SINCE, group: 'reading', titleKey: 'discover.rows.readerFocus', open: { kind: 'reader', mode: 'focus' }, step: 'show' },
  { id: 'reader.tafsir', since: INITIAL_SINCE, group: 'reading', titleKey: 'discover.rows.tafsir', open: { kind: 'reader', mode: null }, step: 'action' },
  { id: 'my-quran', since: INITIAL_SINCE, group: 'mine', titleKey: 'discover.rows.myQuran', open: { kind: 'tab', name: '(my-quran)' }, step: 'show' },
  // The Listen tab: pressing play on a reciter does the step (ListenScreen).
  { id: 'listen.follow', since: INITIAL_SINCE, group: 'listen', titleKey: 'discover.rows.listenFollow', open: { kind: 'tab', name: '(listen)' }, step: 'action' },
  { id: 'worship.salah', since: INITIAL_SINCE, group: 'worship', titleKey: 'discover.rows.salah', open: { kind: 'route', href: '/salah' }, step: 'show' },
  { id: 'worship.azkar', since: INITIAL_SINCE, group: 'worship', titleKey: 'discover.rows.azkar', open: { kind: 'route', href: '/azkar' }, step: 'action' },
  { id: 'worship.sibha', since: INITIAL_SINCE, group: 'worship', titleKey: 'discover.rows.sibha', open: { kind: 'route', href: '/sibha' }, step: 'action' },
  { id: 'worship.goals', since: INITIAL_SINCE, group: 'worship', titleKey: 'discover.rows.goals', open: { kind: 'route', href: '/daily-goals' }, step: 'action' },
  { id: 'app.search', since: INITIAL_SINCE, group: 'app', titleKey: 'discover.rows.search', open: { kind: 'route', href: '/search' }, step: 'action' },
  { id: 'app.settings', since: INITIAL_SINCE, group: 'app', titleKey: 'discover.rows.settings', open: { kind: 'route', href: '/settings' }, step: 'show' },
  { id: 'app.widget', since: INITIAL_SINCE, group: 'app', titleKey: 'discover.rows.widget', open: { kind: 'widget-sheet' }, step: 'show' },
];

export function isDiscoverId(value: string): value is DiscoverId {
  return (DISCOVER_IDS as readonly string[]).includes(value);
}
