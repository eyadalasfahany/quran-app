import { fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { useForceUpdate } from '../use-force-update';

import { ForceUpdateGate } from './ForceUpdateGate';

jest.mock('../use-force-update', () => ({
  useForceUpdate: jest.fn(() => null),
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

const mockUseForceUpdate = useForceUpdate as unknown as jest.Mock;
const mockReduceMotion = useReducedMotion as unknown as jest.Mock;

// The card fades in, so until its animation ends it is hidden to the query, as a dialog is mid-open on a device.
const SHOWN = { includeHiddenElements: true } as const;
const STORE_URL = 'https://apps.apple.com/app/id6828097265';

const copy = {
  ar: { action: 'تحديث الآن', message: 'صدر إصدار جديد من طيبة. حدّث التطبيق للمتابعة.', title: 'يلزم تحديث التطبيق' },
  en: {
    action: 'Update now',
    message: 'A new version of Taybah is available. Update the app to continue.',
    title: 'Update required',
  },
} as const;

describe('ForceUpdateGate', () => {
  let openURL: jest.SpyInstance;

  beforeEach(() => {
    mockUseForceUpdate.mockReturnValue(null);
    mockReduceMotion.mockReturnValue(false);
    mockLiquidGlass.mockReturnValue(false);
    openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    // Linking.openURL is already a mock in the React Native jest setup, so restoring it keeps its earlier calls.
    openURL.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders nothing when no update is required', async () => {
    const view = await renderUi(<ForceUpdateGate />, { locale: 'en' });

    expect(view.queryByText('Update required', SHOWN)).toBeNull();
    expect(view.queryByTestId('force-update-dialog', SHOWN)).toBeNull();
  });

  it('shows the dialog when an update is required', async () => {
    mockUseForceUpdate.mockReturnValue(STORE_URL);
    const view = await renderUi(<ForceUpdateGate />, { locale: 'en' });

    expect(view.getByTestId('force-update-dialog-title', SHOWN)).toBeOnTheScreen();
    expect(view.getByText('Update required', SHOWN)).toBeOnTheScreen();
    expect(view.getByText(copy.en.message, SHOWN)).toBeOnTheScreen();
  });

  it('shows a single action and no cancel button', async () => {
    mockUseForceUpdate.mockReturnValue(STORE_URL);
    const view = await renderUi(<ForceUpdateGate />, { locale: 'en' });

    expect(view.getAllByRole('button', SHOWN)).toHaveLength(1);
    expect(view.getByRole('button', { name: 'Update now', ...SHOWN })).toBeOnTheScreen();
    expect(view.queryByTestId('force-update-dialog-cancel', SHOWN)).toBeNull();
  });

  it('opens the store link when the action is pressed', async () => {
    mockUseForceUpdate.mockReturnValue(STORE_URL);
    const view = await renderUi(<ForceUpdateGate />, { locale: 'en' });

    fireEvent.press(view.getByRole('button', { name: 'Update now', ...SHOWN }));

    expect(openURL).toHaveBeenCalledWith(STORE_URL);
  });

  it('neither closes nor opens anything when the scrim is pressed', async () => {
    mockUseForceUpdate.mockReturnValue(STORE_URL);
    const view = await renderUi(<ForceUpdateGate />, { locale: 'en' });

    fireEvent.press(view.getByTestId('force-update-dialog-scrim', SHOWN));

    expect(openURL).not.toHaveBeenCalled();
    expect(view.getByText('Update required', SHOWN)).toBeOnTheScreen();
  });

  it('neither closes nor opens anything on Android back', async () => {
    mockUseForceUpdate.mockReturnValue(STORE_URL);
    const view = await renderUi(<ForceUpdateGate />, { locale: 'en' });

    fireEvent(view.getByTestId('force-update-dialog'), 'requestClose');

    expect(openURL).not.toHaveBeenCalled();
    expect(view.getByText('Update required', SHOWN)).toBeOnTheScreen();
  });

  it.each(locales)('renders the title, message and action in %s', async (locale) => {
    mockUseForceUpdate.mockReturnValue(STORE_URL);
    const view = await renderUi(<ForceUpdateGate />, { locale });

    expect(view.getByText(copy[locale].title, SHOWN)).toBeOnTheScreen();
    expect(view.getByText(copy[locale].message, SHOWN)).toBeOnTheScreen();
    expect(view.getByRole('button', { name: copy[locale].action, ...SHOWN })).toBeOnTheScreen();
  });

  it.each(locales)('marks the title as a header and the card as a modal in %s', async (locale) => {
    mockUseForceUpdate.mockReturnValue(STORE_URL);
    const view = await renderUi(<ForceUpdateGate />, { locale });

    expect(view.getByRole('header', { name: copy[locale].title, ...SHOWN })).toBeOnTheScreen();
    expect(view.getByTestId('force-update-dialog-card', SHOWN).props.accessibilityViewIsModal).toBe(true);
  });

  it('keeps the action at least 44 pt high', async () => {
    mockUseForceUpdate.mockReturnValue(STORE_URL);
    const view = await renderUi(<ForceUpdateGate />, { locale: 'en' });

    expect(flatStyle(view.getByRole('button', { name: 'Update now', ...SHOWN }).props.style).minHeight).toBe(48);
  });
});
