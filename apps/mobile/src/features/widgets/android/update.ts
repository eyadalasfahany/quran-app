import { requestWidgetUpdate } from 'react-native-android-widget';

import { readWidgetSnapshot } from '../snapshot/store';

import { renderProvider } from './render';
import { WIDGET_PROVIDER_NAMES, type WidgetProviderName } from './names';
import { widgetScheme } from './scheme';

/**
 * Asks every placed Android widget to redraw from the stored snapshot (ADR 0035 §4: on each snapshot change). A widget
 * type with no placed instance does nothing. `except` skips one provider, for a caller that has drawn it already.
 */
export async function requestAndroidWidgetUpdates(options: { except?: WidgetProviderName } = {}): Promise<void> {
  const scheme = widgetScheme();
  for (const name of WIDGET_PROVIDER_NAMES) {
    if (name === options.except) {
      continue;
    }
    await requestWidgetUpdate({
      renderWidget: () => renderProvider(name, readWidgetSnapshot(), new Date(), scheme),
      widgetName: name,
    });
  }
}
