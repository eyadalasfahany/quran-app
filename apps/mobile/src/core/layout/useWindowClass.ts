import { useState } from 'react';
import { useWindowDimensions } from 'react-native';

import { isShortWindowHeight, nextWindowClass, widthClassFor, type WindowClass } from './window-class';

/**
 * The width class with hysteresis (±16 at the 600 and 840 boundaries), ignoring height. Use it where width alone decides,
 * such as the centred sheet card and the menu's column count, so a landscape phone still gets the wide layout (ADR 0036).
 */
export function useWidthClass(): WindowClass {
  const { width } = useWindowDimensions();
  const [snapshot, setSnapshot] = useState(() => ({
    width,
    windowClass: widthClassFor(width),
  }));

  if (snapshot.width !== width) {
    const windowClass = nextWindowClass(width, snapshot.windowClass);
    setSnapshot({ width, windowClass });
    return windowClass;
  }

  return snapshot.windowClass;
}

/**
 * The layout class (ADR 0036): compact for every short window (under 480 pt high) and otherwise the width class. The
 * sidebar, the docked reader panel and the side panels follow this class, so they appear only on windows that are both
 * wide and not short.
 */
export function useWindowClass(): WindowClass {
  const widthClass = useWidthClass();
  const { height } = useWindowDimensions();
  return isShortWindowHeight(height) ? 'compact' : widthClass;
}

/** Whether the window is short (under 480 pt high): a landscape phone. Layouts that cannot fit a column use it (ADR 0036). */
export function useIsShortWindow(): boolean {
  return isShortWindowHeight(useWindowDimensions().height);
}
