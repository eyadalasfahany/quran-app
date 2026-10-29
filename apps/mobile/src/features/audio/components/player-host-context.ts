import { createContext, useContext } from 'react';
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
};

export const PlayerHostContext = createContext<PlayerHostValue | null>(null);

/** The enclosing PlayerHost. Throws outside one: the player's content is only ever rendered inside it. */
export function usePlayerHost(): PlayerHostValue {
  const value = useContext(PlayerHostContext);
  if (value === null) {
    throw new Error('usePlayerHost must be used inside a PlayerHost.');
  }
  return value;
}
