import { createContext, useContext, type ReactNode } from 'react';
import type { PanGesture } from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';

/** What the full player's content can ask of the host it sits in. */
export type PlayerHostValue = {
  /** Slides the player down, then leaves the route. Runs once, however many times it is called. */
  close: () => void;
  /** The player's pan, which the scroll view pairs with `simultaneousWith`. */
  panGesture: PanGesture;
  /** The content's scroll offset, written by PlayerScrollView on the UI thread. */
  scrollOffset: SharedValue<number>;
  /** Whether the current touch began on the scrolling content, written by PlayerScrollView. */
  scrollTouched: SharedValue<boolean>;
  /**
   * Shows `node` above the player's content, or clears it with null. Menus use it instead of a React Native
   * Modal: the player is itself a native modal, and iOS silently refuses to present a second one from it.
   */
  setOverlay: (node: ReactNode | null) => void;
};

export const PlayerHostContext = createContext<PlayerHostValue | null>(null);

/** The enclosing PlayerHost, or null outside one. */
export function useOptionalPlayerHost(): PlayerHostValue | null {
  return useContext(PlayerHostContext);
}

/** The enclosing PlayerHost. Throws outside one: the player's content is only ever rendered inside it. */
export function usePlayerHost(): PlayerHostValue {
  const value = useContext(PlayerHostContext);
  if (value === null) {
    throw new Error('usePlayerHost must be used inside a PlayerHost.');
  }
  return value;
}
