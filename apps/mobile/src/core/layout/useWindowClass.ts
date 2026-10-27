import { useState } from 'react';
import { useWindowDimensions } from 'react-native';

import { nextWindowClass, windowClassFor, type WindowClass } from './window-class';

export function useWindowClass(): WindowClass {
  const { width } = useWindowDimensions();
  const [snapshot, setSnapshot] = useState(() => ({
    width,
    windowClass: windowClassFor(width),
  }));

  if (snapshot.width !== width) {
    const windowClass = nextWindowClass(width, snapshot.windowClass);
    setSnapshot({ width, windowClass });
    return windowClass;
  }

  return snapshot.windowClass;
}
