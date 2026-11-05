import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { Linking, Platform } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { getBootstrap } from '@/core/api';
import type { BootstrapResponse } from '@quran/api-contract';

import { locales, renderUi } from '../../../../jest/render-ui';

import { ForceUpdateGate } from './ForceUpdateGate';

// The real useForceUpdate and the real ForceUpdateGate run together here. Only the native version, the route segments,
// the API client and the visual mocks below are replaced.
const mockApplication = { nativeApplicationVersion: '1.0.1' as string | null };
// The route segments the hook reads. Tabs are under the (main) group; a sheet is a root route above it.
const mockSegments = { value: ['(main)', '(home)'] as string[] };
const TABS = ['(main)', '(home)'];
const SHEET = ['reader-settings'];

jest.mock('expo-application', () => ({
  get nativeApplicationVersion() {
    return mockApplication.nativeApplicationVersion;
  },
}));

jest.mock('expo-router', () => ({
  useSegments: () => mockSegments.value,
}));

jest.mock('@/core/api', () => ({
  getBootstrap: jest.fn(),
}));

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  // The mock is an ES module, so the default import (Animated) resolves.
  return {
    ...actual,
    __esModule: true,
    default: actual.default,
    useReducedMotion: jest.fn(() => false),
  };
});

const mockLiquidGlass = jest.fn(() => false);

jest.mock('expo-glass-effect', () => ({
  ...jest.requireActual('expo-glass-effect'),
  isLiquidGlassAvailable: () => mockLiquidGlass(),
}));

const mockGetBootstrap = getBootstrap as jest.MockedFunction<typeof getBootstrap>;
const mockReduceMotion = useReducedMotion as unknown as jest.Mock;

const IOS_STORE = 'https://apps.apple.com/app/id6828097265';
const ANDROID_STORE = 'https://play.google.com/store/apps/details?id=com.taybahapp.taybah';

// The card fades in, so until its animation ends it is hidden to the query, as a dialog is mid-open on a device.
const SHOWN = { includeHiddenElements: true } as const;
const ACTION_LABEL = { ar: 'تحديث الآن', en: 'Update now' } as const;
const DIALOG = 'force-update-dialog';
const CONFIRM = 'force-update-dialog-confirm';

function bootstrap(minimum: { ios: string | null; android: string | null }): BootstrapResponse {
  return {
    min_app_version: minimum,
    store_url: { ios: IOS_STORE, android: ANDROID_STORE },
  };
}

// Lets the launch check finish: it awaits the API call, then sets state.
async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('ForceUpdateGate with the real useForceUpdate', () => {
  let openURL: jest.SpyInstance;

  beforeEach(() => {
    mockApplication.nativeApplicationVersion = '1.0.1';
    mockSegments.value = TABS;
    mockReduceMotion.mockReturnValue(false);
    mockLiquidGlass.mockReturnValue(false);
    jest.replaceProperty(Platform, 'OS', 'ios');
    openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    openURL.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    mockGetBootstrap.mockReset();
  });

  describe('on iOS', () => {
    it('shows the dialog below the minimum, and the confirm action opens the App Store link', async () => {
      mockGetBootstrap.mockResolvedValue(bootstrap({ ios: '1.0.2', android: null }));

      const view = await renderUi(<ForceUpdateGate />, { locale: 'en' });

      await waitFor(() => expect(view.getByTestId(DIALOG, SHOWN)).toBeOnTheScreen());
      expect(view.getByText('Update required', SHOWN)).toBeOnTheScreen();

      fireEvent.press(view.getByTestId(CONFIRM, SHOWN));

      expect(openURL).toHaveBeenCalledTimes(1);
      expect(openURL).toHaveBeenCalledWith('https://apps.apple.com/app/id6828097265');
    });

    it('shows no dialog on a screen above the tabs', async () => {
      mockSegments.value = SHEET;
      mockGetBootstrap.mockResolvedValue(bootstrap({ ios: '1.0.2', android: null }));

      const view = await renderUi(<ForceUpdateGate />, { locale: 'en' });
      await settle();

      expect(mockGetBootstrap).toHaveBeenCalled();
      expect(view.queryByTestId(DIALOG, SHOWN)).toBeNull();
      expect(view.queryByText('Update required', SHOWN)).toBeNull();
    });

    it('shows no dialog at the minimum', async () => {
      mockGetBootstrap.mockResolvedValue(bootstrap({ ios: '1.0.1', android: null }));

      const view = await renderUi(<ForceUpdateGate />, { locale: 'en' });
      await settle();

      expect(mockGetBootstrap).toHaveBeenCalled();
      expect(view.queryByTestId(DIALOG, SHOWN)).toBeNull();
    });

    it('shows no dialog when the API cannot be reached', async () => {
      mockGetBootstrap.mockRejectedValue(new Error('offline'));

      const view = await renderUi(<ForceUpdateGate />, { locale: 'en' });
      await settle();

      expect(mockGetBootstrap).toHaveBeenCalled();
      expect(view.queryByTestId(DIALOG, SHOWN)).toBeNull();
      expect(openURL).not.toHaveBeenCalled();
    });
  });

  describe('on Android', () => {
    it('shows the dialog below the minimum, and the confirm action opens the Play Store link', async () => {
      jest.replaceProperty(Platform, 'OS', 'android');
      mockGetBootstrap.mockResolvedValue(bootstrap({ ios: null, android: '1.0.2' }));

      const view = await renderUi(<ForceUpdateGate />, { locale: 'en' });

      await waitFor(() => expect(view.getByTestId(DIALOG, SHOWN)).toBeOnTheScreen());

      fireEvent.press(view.getByTestId(CONFIRM, SHOWN));

      expect(openURL).toHaveBeenCalledWith(ANDROID_STORE);
    });
  });

  // The copy is not what this file checks, but the real hook must hand the gate a title in each locale.
  it.each(locales)('shows the dialog in %s when below the minimum', async (locale) => {
    mockGetBootstrap.mockResolvedValue(bootstrap({ ios: '1.0.2', android: null }));

    const view = await renderUi(<ForceUpdateGate />, { locale });

    await waitFor(() => expect(view.getByTestId(DIALOG, SHOWN)).toBeOnTheScreen());
    expect(view.getByRole('button', { name: ACTION_LABEL[locale], ...SHOWN })).toBeOnTheScreen();
  });
});
