import { router, type Href } from 'expo-router';

/** The Menu tab: the parent of most pushed screens (Settings, Reminders, Hijri, Khatma, Moon, الصلاة). */
export const MENU_TAB = '/(main)/(menu)' as Href;

/** The Home tab: the parent of Search and the Azkar home. */
export const HOME_TAB = '/(main)/(home)' as Href;

/**
 * Back or close. With history it pops; a screen opened with nothing under it (a deep link, a widget launch or a
 * restored launch) replaces itself with its parent instead, so the user is never left on a dead end.
 */
export function goBackOr(fallback: Href): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallback);
}
