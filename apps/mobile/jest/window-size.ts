import { Dimensions } from 'react-native';

/** Sets the window size the app sees (points). Use it to test short and tall windows (ADR 0036). */
export function setWindowSize(width: number, height: number): void {
  Dimensions.set({
    screen: { fontScale: 1, height, scale: 1, width },
    window: { fontScale: 1, height, scale: 1, width },
  });
}

/** Restores the phone portrait size the other tests assume. Call it from afterEach. */
export function resetWindowSize(): void {
  setWindowSize(390, 844);
}

/** A landscape phone: short (under 480 pt) and wide (ADR 0036). */
export const LANDSCAPE_PHONE = { height: 390, width: 844 } as const;
