import type { Href } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';

export type DestinationLabel = 'tabs.home' | 'tabs.mushaf' | 'tabs.listen' | 'tabs.myQuran';

export type Destination = {
  name: '(home)' | '(mushaf)' | '(listen)' | '(my-quran)';
  href: Href;
  label: DestinationLabel;
  symbol: SFSymbol;
  androidIcon: 'home' | 'menu_book' | 'headphones' | 'bookmark' | 'account_circle';
  testID: 'home' | 'mushaf' | 'listen' | 'my-quran';
};

// Full group paths: every tab's index is `/`, so typed routes need the group to tell them apart.
export const destinations = [
  { name: '(home)', href: '/(main)/(home)', label: 'tabs.home', symbol: 'house', androidIcon: 'home', testID: 'home' },
  {
    name: '(mushaf)',
    href: '/(main)/(mushaf)',
    label: 'tabs.mushaf',
    symbol: 'book',
    androidIcon: 'menu_book',
    testID: 'mushaf',
  },
  {
    name: '(listen)',
    href: '/(main)/(listen)',
    label: 'tabs.listen',
    symbol: 'headphones',
    androidIcon: 'headphones',
    testID: 'listen',
  },
  {
    name: '(my-quran)',
    href: '/(main)/(my-quran)',
    label: 'tabs.myQuran',
    symbol: 'person.crop.circle',
    androidIcon: 'account_circle',
    testID: 'my-quran',
  },
] as const satisfies readonly Destination[];

const allDestinations = destinations as unknown as Destination[];

export const tabDestinations = allDestinations;

export const sidebarDestinations = [
  allDestinations.find((d) => d.name === '(my-quran)')!,
  ...allDestinations.filter((d) => d.name !== '(my-quran)'),
];
