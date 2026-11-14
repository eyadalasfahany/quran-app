import type { ReactElement } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { renderUi } from './render-ui';

/** renderUi inside the gesture root the Seerah map and timeline need. */
export function renderGesture(ui: ReactElement, options?: Parameters<typeof renderUi>[1]) {
  return renderUi(<GestureHandlerRootView>{ui}</GestureHandlerRootView>, options);
}
