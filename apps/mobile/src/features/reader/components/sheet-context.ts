import { createContext, useContext } from 'react';
import type { PanGesture } from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';

import type { Detent } from '../form-sheet';

/** What a sheet's content can ask of the card it sits in. */
export type SheetContextValue = {
  /** Slides the card down, then leaves the route. Runs once, however many times it is called. */
  close: () => void;
  /** Moves the card to the full detent. */
  expand: () => void;
  /** Moves the card to the mid detent. */
  collapse: () => void;
  /** The detent the card rests at, for consumers that render from it. */
  detent: Detent;
  /** The card's pan, which a scroll view pairs with `simultaneousWith`. */
  panGesture: PanGesture;
  /** The content's scroll offset, written by SheetScrollView on the UI thread. */
  scrollOffset: SharedValue<number>;
  /** Whether the current touch began on the scrolling content, written by SheetScrollView. */
  scrollTouched: SharedValue<boolean>;
};

export const SheetContext = createContext<SheetContextValue | null>(null);

/** The enclosing sheet, or null outside a SheetHost (the expanded-window side panel). */
export function useSheet(): SheetContextValue | null {
  return useContext(SheetContext);
}
