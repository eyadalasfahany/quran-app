import Constants from 'expo-constants';

import { WIDGET_SCHEMES, type WidgetScheme } from '../snapshot/deep-links';

/**
 * The URL scheme of this build (`taybah` or `taybah-dev`, `app.config.ts`). Widgets build their deep links in it, so a
 * dev build opens `taybah-dev://`. Falls back to production when the config has no scheme.
 */
export function widgetScheme(): WidgetScheme {
  const scheme = Constants.expoConfig?.scheme;
  const value = typeof scheme === 'string' ? scheme : '';
  return (WIDGET_SCHEMES as readonly string[]).includes(value) ? (value as WidgetScheme) : 'taybah';
}
