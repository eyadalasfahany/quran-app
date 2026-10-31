import type { Href } from 'expo-router';

/** Azkar routes (app/azkar/*). Segments are encoded, so content keys with `:` or `-` stay one segment. */
export const azkarHref = {
  home: '/azkar' as Href,
  search: '/azkar/search' as Href,
  favorites: '/azkar/favorites' as Href,
  category: (categoryId: string): Href => `/azkar/category/${encodeURIComponent(categoryId)}` as Href,
  read: (categoryId: string, unitKey?: string): Href => {
    const base = `/azkar/read/${encodeURIComponent(categoryId)}`;
    return (unitKey === undefined ? base : `${base}?unit=${encodeURIComponent(unitKey)}`) as Href;
  },
  entry: (entryKey: string): Href => `/azkar/entry/${encodeURIComponent(entryKey)}` as Href,
};
