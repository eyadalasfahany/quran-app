import { colors } from '@quran/design-tokens';
import { act, renderHook } from '@testing-library/react-native';

import {
  readAppearance,
  readDarkAfterMaghrib,
  resolveThemeName,
  saveAppearance,
  saveDarkAfterMaghrib,
  useResolvedTheme,
} from '@/core/theme';
import { storage, storageKeys } from '@/core/storage/mmkv';

const mockColorScheme: { current: 'light' | 'dark' | null } = { current: 'light' };

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => mockColorScheme.current,
}));

describe('resolveThemeName', () => {
  it('follows the system when appearance is automatic', () => {
    expect(resolveThemeName({ appearance: 'automatic', colorScheme: 'light', darkAfterMaghrib: false, afterMaghrib: false })).toBe('light');
    expect(resolveThemeName({ appearance: 'automatic', colorScheme: 'dark', darkAfterMaghrib: false, afterMaghrib: false })).toBe('dark');
  });

  it('uses light when the system scheme is not known yet', () => {
    expect(resolveThemeName({ appearance: 'automatic', colorScheme: null, darkAfterMaghrib: false, afterMaghrib: false })).toBe('light');
    expect(resolveThemeName({ appearance: 'automatic', colorScheme: undefined, darkAfterMaghrib: false, afterMaghrib: false })).toBe('light');
  });

  it('keeps a reader override ahead of the system scheme', () => {
    expect(resolveThemeName({ appearance: 'sepia', colorScheme: 'dark', darkAfterMaghrib: false, afterMaghrib: false })).toBe('sepia');
    expect(resolveThemeName({ appearance: 'light', colorScheme: 'dark', darkAfterMaghrib: false, afterMaghrib: false })).toBe('light');
    expect(resolveThemeName({ appearance: 'dark', colorScheme: 'light', darkAfterMaghrib: false, afterMaghrib: false })).toBe('dark');
  });

  it('switches to dark after Maghrib only when that opt-in is on', () => {
    expect(resolveThemeName({ appearance: 'sepia', colorScheme: 'light', darkAfterMaghrib: false, afterMaghrib: true })).toBe('sepia');
    expect(resolveThemeName({ appearance: 'sepia', colorScheme: 'light', darkAfterMaghrib: true, afterMaghrib: false })).toBe('sepia');
    expect(resolveThemeName({ appearance: 'light', colorScheme: 'light', darkAfterMaghrib: true, afterMaghrib: true })).toBe('dark');
    expect(resolveThemeName({ appearance: 'automatic', colorScheme: 'light', darkAfterMaghrib: true, afterMaghrib: true })).toBe('dark');
  });
});

describe('appearance preference', () => {
  beforeEach(() => {
    storage.remove(storageKeys.appearance);
    storage.remove(storageKeys.darkAfterMaghrib);
  });

  it('defaults to automatic and dark-after-Maghrib off', () => {
    expect(readAppearance()).toBe('automatic');
    expect(readDarkAfterMaghrib()).toBe(false);
  });

  it('round-trips a reader override and the Maghrib opt-in', () => {
    saveAppearance('sepia');
    saveDarkAfterMaghrib(true);

    expect(readAppearance()).toBe('sepia');
    expect(storage.getString(storageKeys.appearance)).toBe('sepia');
    expect(readDarkAfterMaghrib()).toBe(true);
  });

  it('ignores a stored appearance that is not a known choice', () => {
    storage.set(storageKeys.appearance, 'gold');

    expect(readAppearance()).toBe('automatic');
  });
});

describe('useResolvedTheme', () => {
  beforeEach(() => {
    storage.remove(storageKeys.appearance);
    storage.remove(storageKeys.darkAfterMaghrib);
    mockColorScheme.current = 'light';
  });

  it('follows a dark system scheme while appearance is automatic', async () => {
    mockColorScheme.current = 'dark';

    const { result } = await renderHook(() => useResolvedTheme());

    expect(result.current).toBe('dark');
    expect(colors[result.current].surface).toBe(colors.dark.surface);
  });

  it('uses a saved reader override instead of the system scheme', async () => {
    mockColorScheme.current = 'dark';
    saveAppearance('sepia');

    const { result } = await renderHook(() => useResolvedTheme());

    expect(result.current).toBe('sepia');
  });

  it('applies a saved change without remounting', async () => {
    const { result } = await renderHook(() => useResolvedTheme());

    expect(result.current).toBe('light');

    await act(async () => {
      saveAppearance('dark');
    });

    expect(result.current).toBe('dark');
  });

  it('stays on the reader theme after Maghrib until the opt-in is on', async () => {
    saveAppearance('sepia');

    const before = await renderHook(() => useResolvedTheme(true));
    expect(before.result.current).toBe('sepia');
    await before.unmount();

    saveDarkAfterMaghrib(true);

    const after = await renderHook(() => useResolvedTheme(true));
    expect(after.result.current).toBe('dark');
  });
});
