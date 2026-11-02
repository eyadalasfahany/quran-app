import type { ClickActionProps } from 'react-native-android-widget';

import { widgetUrl } from '../snapshot/deep-links';
import type { WidgetLabels, WidgetLocale, WidgetSnapshot } from '../snapshot/types';

import { paletteFor, type WidgetMode, type WidgetPalette } from './theme';

/** Everything one layout needs to draw one mode of one widget. */
export type WidgetContext = {
  snapshot: WidgetSnapshot;
  mode: WidgetMode;
  palette: WidgetPalette;
  locale: WidgetLocale;
  /** Arabic lays rows out right to left. The direction follows the app language, not the device (ADR 0035 §1.6). */
  rtl: boolean;
  labels: WidgetLabels;
  /** The render time: the next prayer is chosen against it. */
  now: Date;
  /** The variant's URL scheme (`taybah` or `taybah-dev`). */
  scheme: string;
};

export function widgetContext(input: {
  snapshot: WidgetSnapshot;
  mode: WidgetMode;
  now: Date;
  scheme: string;
}): WidgetContext {
  const { snapshot, mode, now, scheme } = input;
  return {
    labels: snapshot.labels,
    locale: snapshot.locale,
    mode,
    now,
    palette: paletteFor(mode),
    rtl: snapshot.locale === 'ar',
    scheme,
    snapshot,
  };
}

/**
 * The click for a tap that opens an allowed route in the app (`OPEN_URI`). A path that is not allowed gets no action at
 * all, so a tap does nothing rather than opening something unexpected.
 */
export function openPath(ctx: WidgetContext, path: string): ClickActionProps {
  const uri = widgetUrl(path, ctx.scheme);
  return uri === null ? {} : { clickAction: 'OPEN_URI', clickActionData: { uri } };
}
