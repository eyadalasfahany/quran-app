import { renderHook } from '@testing-library/react-native';
import { Dimensions, Platform } from 'react-native';

import { useTabBarClearance } from './useTabBarClearance';

let mockBottomInset = 0;

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: () => ({ bottom: mockBottomInset, left: 0, right: 0, top: 0 }),
  };
});

function setPlatform(os: Platform['OS']) {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
}

function setWindow(width: number, height: number) {
  Dimensions.set({
    screen: { fontScale: 1, height, scale: 1, width },
    window: { fontScale: 1, height, scale: 1, width },
  });
}

describe('useTabBarClearance', () => {
  const originalOs = Platform.OS;

  beforeEach(() => {
    mockBottomInset = 0;
    setWindow(390, 844);
  });

  afterEach(() => {
    setPlatform(originalOs);
    setWindow(390, 844);
  });

  it('pads iOS by the native bar footprint, since the bar does not inset scroll views (92)', async () => {
    setPlatform('ios');
    mockBottomInset = 34;
    const { result } = await renderHook(() => useTabBarClearance());

    expect(result.current).toBe(92);
  });

  it('is the Android floating bar footprint from the system inset (ADR 0033)', async () => {
    setPlatform('android');
    mockBottomInset = 24;
    const { result } = await renderHook(() => useTabBarClearance());

    expect(result.current).toBe(100);
  });

  it('is 0 in an expanded window on iOS, where the tablet has the rail and no bottom bar (ADR 0051, amended 2 Nov 2026)', async () => {
    setPlatform('ios');
    mockBottomInset = 34;
    setWindow(1024, 768);
    const { result } = await renderHook(() => useTabBarClearance());

    expect(result.current).toBe(0);
  });

  it('is 0 in an expanded window on Android, where the tablet has the rail and no floating bar (ADR 0051, amended)', async () => {
    setPlatform('android');
    mockBottomInset = 24;
    setWindow(1280, 800);
    const { result } = await renderHook(() => useTabBarClearance());

    expect(result.current).toBe(0);
  });

  it('keeps the bottom-bar clearance on a medium window, which is still a phone layout (ADR 0051)', async () => {
    setPlatform('ios');
    mockBottomInset = 34;
    setWindow(700, 1000);
    const { result } = await renderHook(() => useTabBarClearance());

    expect(result.current).toBe(92);
  });

  it('is 0 in a short window, where the rail takes the start edge (ADR 0036)', async () => {
    setPlatform('ios');
    mockBottomInset = 34;
    setWindow(844, 390);
    const { result } = await renderHook(() => useTabBarClearance());

    expect(result.current).toBe(0);
  });
});
