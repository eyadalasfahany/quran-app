import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { walk } from '../android/test-tree';
import { renderProvider } from '../android/render';
import { WIDGET_PROVIDERS, type WidgetProviderName } from '../android/names';

import { widgetPaths, WIDGET_SCHEMES } from './deep-links';
import { fullSnapshot } from './test-fixtures';

const APP_DIR = join(__dirname, '..', '..', '..', '..', 'app');

// Each allowed widget path, and the expo-router file that serves it. A path with no file is a dead link.
const ROUTE_FILES: Record<string, string> = {
  '/azkar': 'azkar/index.tsx',
  '/azkar/read/[categoryId]': 'azkar/read/[categoryId].tsx',
  '/daily-goals': 'daily-goals.tsx',
  '/khatma': 'khatma.tsx',
  '/read/[verseKey]': 'read/[verseKey].tsx',
  '/salah': 'salah/index.tsx',
  '/sibha': 'sibha.tsx',
};

const SCHEME = WIDGET_SCHEMES[0];

// What each widget's tap opens, with the full snapshot (the reading place is 2:255).
const TAP_TARGETS: Record<WidgetProviderName, string> = {
  [WIDGET_PROVIDERS.azkar]: widgetPaths.azkar,
  [WIDGET_PROVIDERS.continueReading]: widgetPaths.reading('2:255'),
  [WIDGET_PROVIDERS.misbaha]: widgetPaths.misbaha,
  [WIDGET_PROVIDERS.nextPrayer]: widgetPaths.prayer,
  [WIDGET_PROVIDERS.nextPrayerWide]: widgetPaths.prayer,
  [WIDGET_PROVIDERS.progress]: widgetPaths.progress,
};

/** The `OPEN_URI` address on the widget's root card, or null when the card opens nothing by URI. */
function rootUri(provider: WidgetProviderName): string | null {
  const rendered = renderProvider(provider, fullSnapshot(), new Date(2026, 10, 2, 10, 0), SCHEME);
  const root = walk(rendered.light).find((element) => element.props.clickAction === 'OPEN_URI');
  const data = root?.props.clickActionData as { uri?: string } | undefined;
  return data?.uri ?? null;
}

describe('widget tap targets are routes the app has', () => {
  it.each(Object.entries(TAP_TARGETS))('%s opens its own route', (provider, path) => {
    expect(rootUri(provider as WidgetProviderName)).toBe(`${SCHEME}://${path.slice(1)}`);
  });

  it.each(Object.entries(ROUTE_FILES))('%s is served by app/%s', (path, file) => {
    expect(existsSync(join(APP_DIR, file))).toBe(true);
    expect(path.length).toBeGreaterThan(0);
  });

  it('every widget target is one of the mapped routes', () => {
    for (const path of Object.values(TAP_TARGETS)) {
      const mapped = path.startsWith('/read/') ? '/read/[verseKey]' : path.startsWith('/azkar/read/') ? '/azkar/read/[categoryId]' : path;
      expect(ROUTE_FILES).toHaveProperty([mapped]);
    }
  });

  it('the misbaha «+» is an in-widget action, not an app route', () => {
    const rendered = renderProvider(WIDGET_PROVIDERS.misbaha, fullSnapshot(), new Date(2026, 10, 2, 10, 0), SCHEME);
    const plus = walk(rendered.light).find((element) => element.props.clickAction === 'taybah.misbaha.tap');
    expect(plus).toBeDefined();
  });
});
