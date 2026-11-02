/**
 * The routes a widget may open (ADR 0035 §1.3). Anything else is refused: a widget never navigates to a route the app
 * does not have, and the native click action only ever receives a URL this module built.
 */
const EXACT_ROUTES: readonly string[] = ['/salah', '/sibha', '/daily-goals', '/khatma', '/azkar'];

const VERSE_KEY = /^[1-9]\d*:[1-9]\d*$/;
const CATEGORY_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** The URL schemes of the two variants (`app.config.ts`). */
export const WIDGET_SCHEMES = ['taybah', 'taybah-dev'] as const;

export type WidgetScheme = (typeof WIDGET_SCHEMES)[number];

/** True when `path` is one of the allowed routes, with its dynamic segment well formed. */
export function isAllowedWidgetPath(path: string): boolean {
  if (EXACT_ROUTES.includes(path)) {
    return true;
  }
  if (path.startsWith('/read/')) {
    return VERSE_KEY.test(path.slice('/read/'.length));
  }
  if (path.startsWith('/azkar/read/')) {
    return CATEGORY_ID.test(path.slice('/azkar/read/'.length));
  }
  return false;
}

/**
 * The URL for an allowed path in a variant's scheme, or null when the path or the scheme is not allowed. The native
 * `OPEN_URI` action opens it, and expo-router routes it to the same screen as a notification tap.
 */
export function widgetUrl(path: string, scheme: string): string | null {
  if (!(WIDGET_SCHEMES as readonly string[]).includes(scheme) || !isAllowedWidgetPath(path)) {
    return null;
  }
  return `${scheme}://${path.slice(1)}`;
}

/** The widget targets, one per surface (ADR 0035 §2). */
export const widgetPaths = {
  azkar: '/azkar',
  azkarCategory: (categoryId: string): string => `/azkar/read/${categoryId}`,
  misbaha: '/sibha',
  prayer: '/salah',
  progress: '/daily-goals',
  reading: (verseKey: string): string => `/read/${verseKey}`,
  wird: '/khatma',
} as const;
