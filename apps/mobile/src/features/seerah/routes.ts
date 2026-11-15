import type { Href } from 'expo-router';

import { MENU_TAB } from '@/core/navigation/go-back';

/** Seerah routes (app/seerah/*). The event id is the book's slug (`e042`), encoded. */
export const seerahHref = {
  home: '/seerah' as Href,
  list: '/seerah?view=list' as Href,
  /**
   * The map, focused on an age and/or showing a place (the event page's chips). Always `view=map`, so it lands on the map
   * whatever view the reader stored; the parameter wins over the stored choice (`initialSeerahView`).
   */
  map: (options: { age?: number; place?: string } = {}): Href => {
    const query = [
      'view=map',
      options.age === undefined ? null : `age=${options.age}`,
      options.place === undefined ? null : `place=${encodeURIComponent(options.place)}`,
    ].filter((part) => part !== null);
    return `/seerah?${query.join('&')}` as Href;
  },
  event: (id: string): Href => `/seerah/event/${encodeURIComponent(id)}` as Href,
  /** The Menu tab, where Seerah is reached from (its no-history back fallback). */
  menuTab: MENU_TAB,
};

export { goBackOr } from '@/core/navigation/go-back';

/** `?view=list` opens the list; anything else is the map (a bad value is ignored, never an error). */
export function parseSeerahView(value: string | string[] | undefined): 'map' | 'list' | null {
  const single = Array.isArray(value) ? value[0] : value;
  return single === 'list' ? 'list' : single === 'map' ? 'map' : null;
}

/** `?age=` as a whole age 0 to 63; anything else is no focus. */
export function parseSeerahAge(value: string | string[] | undefined): number | null {
  const single = Array.isArray(value) ? value[0] : value;
  if (single === undefined || !/^\d{1,2}$/.test(single)) {
    return null;
  }
  const age = Number(single);
  return age >= 0 && age <= 63 ? age : null;
}
