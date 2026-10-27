import type { Href } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';

export type DestinationLabel = 'tabs.home' | 'tabs.mushaf' | 'tabs.listen' | 'tabs.myQuran';

export type Destination = {
  name: '(home)' | '(mushaf)' | '(listen)' | '(my-quran)';
  href: Href;
  label: DestinationLabel;
  symbol: SFSymbol;
  androidIcon: 'home' | 'menu_book' | 'headphones' | 'edit';
  testID: 'home' | 'mushaf' | 'listen' | 'my-quran';
};

export const destinations = [
  { name: '(home)', href: '/(home)', label: 'tabs.home', symbol: 'house', androidIcon: 'home', testID: 'home' },
  {
    name: '(mushaf)',
    href: '/(mushaf)',
    label: 'tabs.mushaf',
    symbol: 'book',
    androidIcon: 'menu_book',
    testID: 'mushaf',
  },
  {
    name: '(listen)',
    href: '/(listen)',
    label: 'tabs.listen',
    symbol: 'headphones',
    androidIcon: 'headphones',
    testID: 'listen',
  },
  {
    name: '(my-quran)',
    href: '/(my-quran)',
    label: 'tabs.myQuran',
    symbol: 'pencil',
    androidIcon: 'edit',
    testID: 'my-quran',
  },
] as const satisfies readonly Destination[];
