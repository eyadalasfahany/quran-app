import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { withMisbaha } from '../snapshot/patch';
import type { WidgetMisbaha, WidgetSnapshot } from '../snapshot/types';

import { MISBAHA_TAP_ACTION, WIDGET_PROVIDERS, type WidgetProviderName } from './names';
import { isProviderName, renderProvider } from './render';

/**
 * What the headless task needs from the app. Each is a plain function, so the task is tested without the native module
 * and without MMKV (`register.ts` supplies the real ones).
 */
export type WidgetTaskDeps = {
  now: () => Date;
  scheme: string;
  readSnapshot: () => WidgetSnapshot | null;
  writeSnapshot: (snapshot: WidgetSnapshot) => void;
  /** Counts one tap on the misbaha: the counter and today's total. Returns the counter's new state. */
  recordMisbahaTap: (now: Date) => WidgetMisbaha;
  /** Redraws the other providers after a tap changed the shared numbers. */
  refreshOthers: (except: WidgetProviderName) => Promise<void> | void;
};

const DRAW_ACTIONS: readonly string[] = ['WIDGET_ADDED', 'WIDGET_UPDATE', 'WIDGET_RESIZED'];

/**
 * Handles one widget event (ADR 0035 §3, plan step 4).
 * - Draw events (added, update, resized) render the widget from the stored snapshot. They never change a count.
 * - The misbaha «+» (a custom click action, so the app does not open) counts one tap on the misbaha, stores the new
 *   counter in the snapshot, and redraws. It counts once per click event: the library gives no click id, so a duplicate
 *   delivery cannot be told apart from a second tap, and no dedupe is attempted.
 * - Any other click, and any event for another provider, changes nothing (the native open actions never reach here).
 * - Deleted events do nothing.
 */
export async function handleWidgetTask(props: WidgetTaskHandlerProps, deps: WidgetTaskDeps): Promise<void> {
  const name = props.widgetInfo.widgetName;
  if (!isProviderName(name)) {
    return;
  }

  if (props.widgetAction === 'WIDGET_CLICK') {
    if (props.clickAction !== MISBAHA_TAP_ACTION || name !== WIDGET_PROVIDERS.misbaha) {
      return;
    }
    tapMisbaha(deps);
    draw(props, name, deps);
    await deps.refreshOthers(name);
    return;
  }

  if (DRAW_ACTIONS.includes(props.widgetAction)) {
    draw(props, name, deps);
  }
}

function tapMisbaha(deps: WidgetTaskDeps): void {
  const misbaha = deps.recordMisbahaTap(deps.now());
  const snapshot = deps.readSnapshot();
  if (snapshot !== null) {
    deps.writeSnapshot(withMisbaha(snapshot, misbaha));
  }
}

function draw(props: WidgetTaskHandlerProps, name: WidgetProviderName, deps: WidgetTaskDeps): void {
  props.renderWidget(renderProvider(name, deps.readSnapshot(), deps.now(), deps.scheme));
}
