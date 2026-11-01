import { router, type Href } from 'expo-router';

/** Azkar routes (app/azkar/*). Segments are encoded, so content keys with `:` or `-` stay one segment. */
export const azkarHref = {
  home: '/azkar' as Href,
  search: '/azkar/search' as Href,
  favorites: '/azkar/favorites' as Href,
  /** Saved audio: the downloads screen (ADR 0031 §8). */
  downloads: '/azkar/downloads' as Href,
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

/**
 * Back or close. With history it pops; a screen opened with nothing under it (a deep link or a restored
 * launch) replaces itself with its parent instead, so the user is never left on a dead end.
 */
export function goBackOr(fallback: Href): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallback);
}
