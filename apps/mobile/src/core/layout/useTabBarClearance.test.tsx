import { renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';

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

describe('useTabBarClearance', () => {
  const originalOs = Platform.OS;

  beforeEach(() => {
    mockBottomInset = 0;
  });

  afterEach(() => {
    setPlatform(originalOs);
  });

  it('needs no padding on iOS, where the native bar insets the content', async () => {
    setPlatform('ios');
    mockBottomInset = 34;
    const { result } = await renderHook(() => useTabBarClearance());

    expect(result.current).toBe(0);
  });

  it('is the Android floating bar footprint from the system inset (ADR 0033)', async () => {
    setPlatform('android');
    mockBottomInset = 24;
    const { result } = await renderHook(() => useTabBarClearance());

    expect(result.current).toBe(100);
  });
});
