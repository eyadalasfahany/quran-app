'use no memo';
// Widget trees are built by calling these functions directly, not rendered as React components, so the React Compiler
// must not memoise them: its useMemoCache hook throws "Invalid hook call" outside a render (the wide widget never drew).

import { i18n } from '@/core/i18n/i18n';
import { getLocale } from '@/core/i18n/locale';

import { buildWidgetLabels } from '../snapshot/labels';
import { buildWidgetSnapshot } from '../snapshot/build-snapshot';
import type { WidgetSnapshot } from '../snapshot/types';

import { AzkarWidget } from './AzkarWidget';
import { ContinueReadingWidget } from './ContinueReadingWidget';
import { MisbahaWidget } from './MisbahaWidget';
import { NextPrayerWidget } from './NextPrayerWidget';
import { NextPrayerWideWidget } from './NextPrayerWideWidget';
import { OpenAppWidget } from './OpenAppWidget';
import { ProgressWidget } from './ProgressWidget';
import { widgetContext, type WidgetContext } from './context';
import { WIDGET_PROVIDERS, type WidgetProviderName } from './names';
import type { WidgetMode } from './theme';

/** What the library draws: the light look and the dark look. The platform shows the one that matches the system. */
export type RenderedWidget = { light: ReturnType<typeof NextPrayerWidget>; dark: ReturnType<typeof NextPrayerWidget> };

const LAYOUTS: Record<WidgetProviderName, (ctx: WidgetContext) => ReturnType<typeof NextPrayerWidget>> = {
  [WIDGET_PROVIDERS.azkar]: AzkarWidget,
  [WIDGET_PROVIDERS.continueReading]: ContinueReadingWidget,
  [WIDGET_PROVIDERS.misbaha]: MisbahaWidget,
  [WIDGET_PROVIDERS.nextPrayer]: NextPrayerWidget,
  [WIDGET_PROVIDERS.nextPrayerWide]: NextPrayerWideWidget,
  [WIDGET_PROVIDERS.progress]: ProgressWidget,
};

/** A snapshot with the app's own labels and no data: only the labels matter to the open-the-app state. */
function openAppSnapshot(now: Date, colorMode: WidgetMode): WidgetSnapshot {
  const locale = getLocale();
  return buildWidgetSnapshot({
    azkar: null,
    colorMode,
    labels: buildWidgetLabels(i18n.getFixedT(locale)),
    locale,
    misbaha: { count: 0, target: null, todayTotal: 0 },
    now: now.getTime(),
    prayer: { entries: [], place: null, validUntil: null },
    progress: { percent: 0, rows: [] },
    reading: null,
    wird: null,
  });
}

function draw(name: WidgetProviderName, snapshot: WidgetSnapshot, now: Date, scheme: string, mode: WidgetMode) {
  return LAYOUTS[name](widgetContext({ mode, now, scheme, snapshot }));
}

/**
 * The light and dark looks of one provider, from the stored snapshot. With no snapshot every provider shows the
 * open-the-app card. Pure given its inputs: the headless task, the app's update and the tests all call this.
 */
export function renderProvider(
  name: WidgetProviderName,
  snapshot: WidgetSnapshot | null,
  now: Date,
  scheme: string,
): RenderedWidget {
  if (snapshot === null) {
    return {
      dark: OpenAppWidget(
        widgetContext({ mode: 'dark', now, scheme, snapshot: openAppSnapshot(now, 'dark') }),
      ),
      light: OpenAppWidget(
        widgetContext({ mode: 'light', now, scheme, snapshot: openAppSnapshot(now, 'light') }),
      ),
    };
  }
  return {
    dark: draw(name, snapshot, now, scheme, 'dark'),
    light: draw(name, snapshot, now, scheme, 'light'),
  };
}

/** Whether `name` is one of the providers the app ships. */
export function isProviderName(name: string): name is WidgetProviderName {
  return (Object.values(WIDGET_PROVIDERS) as string[]).includes(name);
}
