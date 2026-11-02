import type { Href } from 'expo-router';

/** Azkar routes (app/azkar/*). Segments are encoded, so content keys with `:` or `-` stay one segment. */
export const azkarHref = {
  home: '/azkar' as Href,
  search: '/azkar/search' as Href,
  favorites: '/azkar/favorites' as Href,
  /** Saved audio: the downloads screen (ADR 0031 §8). */
  downloads: '/azkar/downloads' as Href,
  /** The full Azkar player, a sheet over the reader (ADR 0031 §8). */
  player: '/azkar/player' as Href,
  category: (categoryId: string): Href => `/azkar/category/${encodeURIComponent(categoryId)}` as Href,
  read: (categoryId: string, unitKey?: string): Href => {
    const base = `/azkar/read/${encodeURIComponent(categoryId)}`;
    return (unitKey === undefined ? base : `${base}?unit=${encodeURIComponent(unitKey)}`) as Href;
  },
  entry: (entryKey: string): Href => `/azkar/entry/${encodeURIComponent(entryKey)}` as Href,
  /** The reminder sheet, for a session category or a single entry (ADR 0031 §7). Both are optional. */
  reminders: (scope: { category?: string; entry?: string } = {}): Href => {
    const params = [
      scope.category === undefined ? null : `category=${encodeURIComponent(scope.category)}`,
      scope.entry === undefined ? null : `entry=${encodeURIComponent(scope.entry)}`,
    ].filter((param): param is string => param !== null);
    return (params.length === 0 ? '/azkar/reminders' : `/azkar/reminders?${params.join('&')}`) as Href;
  },
  /** The Menu's home tab, where Azkar home is reached from. */
  homeTab: '/(main)/(home)' as Href,
};

export { goBackOr } from '@/core/navigation/go-back';
