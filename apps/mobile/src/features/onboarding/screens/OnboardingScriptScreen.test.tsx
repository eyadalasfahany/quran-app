import { router } from 'expo-router';
import { fireEvent, screen } from '@testing-library/react-native';

import { storage, storageKeys } from '@/core/storage/mmkv';
import { startSvgMushafDownload } from '@/core/mushaf-pack/useSvgMushafPack';
import { PICKABLE_MUSHAF_KEYS } from '@/features/reader/mushafs';
import { resetReaderSettingsStore, useReaderSettings } from '@/features/reader/settings';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { resetWindowSize, setWindowSize } from '../../../../jest/window-size';

import { OnboardingScriptScreen } from './OnboardingScriptScreen';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => false), push: jest.fn(), replace: jest.fn() },
}));

jest.mock('@/core/mushaf-pack/useSvgMushafPack', () => ({
  startSvgMushafDownload: jest.fn(() => Promise.resolve({ status: 'installed' })),
}));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
  };
});

describe('OnboardingScriptScreen', () => {
  beforeEach(() => {
    storage.remove(storageKeys.readerSettings);
    resetReaderSettingsStore();
    jest.mocked(router.push).mockClear();
  });

  it.each(locales)('renders the pickable mushafs in %s', async (locale) => {
    await renderUi(<OnboardingScriptScreen />, { locale });

    for (const key of PICKABLE_MUSHAF_KEYS) {
      expect(screen.getByTestId(`mushaf-${key}`)).toBeOnTheScreen();
    }
    expect(screen.getAllByRole('radio')).toHaveLength(PICKABLE_MUSHAF_KEYS.length);
    expect(screen.queryByTestId('mushaf-duri')).toBeNull();
  });

  it('shows step 3 of 4', async () => {
    await renderUi(<OnboardingScriptScreen />, { locale: 'en' });

    expect(screen.getByLabelText('Step 3 of 4')).toBeOnTheScreen();
  });

  it('goes back to the tour when there is nothing to go back to', async () => {
    const view = await renderUi(<OnboardingScriptScreen />);

    await fireEvent.press(view.getByTestId('onboarding-back'));

    expect(router.replace).toHaveBeenCalledWith('/(onboarding)/tour');
  });

  it('shows the preview of the riwayah picked, at once', async () => {
    const view = await renderUi(<OnboardingScriptScreen />);
    const before = view.getByTestId('onboarding-mushaf-preview-image').props.source;

    await fireEvent.press(view.getByTestId('mushaf-warsh'));

    expect(view.getByTestId('onboarding-mushaf-preview-image').props.source).not.toBe(before);
  });

  it('shows the Hafs preview above the picker', async () => {
    await renderUi(<OnboardingScriptScreen />);

    expect(screen.getByTestId('onboarding-mushaf-preview')).toBeOnTheScreen();
  });

  it('saves the chosen mushaf on continue and leaves the reading mode at its default', async () => {
    const view = await renderUi(<OnboardingScriptScreen />);

    await fireEvent.press(view.getByTestId('mushaf-warsh'));
    await fireEvent.press(view.getByTestId('onboarding-continue'));

    expect(useReaderSettings.getState().mushaf).toBe('warsh');
    expect(useReaderSettings.getState().mode).toBe('reading');
    expect(router.push).toHaveBeenCalledWith('/(onboarding)/reciter');
  });

  it('keeps Hafs when continuing without a change', async () => {
    const view = await renderUi(<OnboardingScriptScreen />);

    await fireEvent.press(view.getByTestId('onboarding-continue'));

    expect(useReaderSettings.getState().mushaf).toBe('hafs');
  });

  it('starts the download of the chosen riwayah on continue, without waiting for it', async () => {
    jest.mocked(startSvgMushafDownload).mockReturnValueOnce(new Promise(() => undefined));
    const view = await renderUi(<OnboardingScriptScreen />);

    await fireEvent.press(view.getByTestId('mushaf-warsh'));
    await fireEvent.press(view.getByTestId('onboarding-continue'));

    expect(startSvgMushafDownload).toHaveBeenCalledWith('warsh');
    expect(router.push).toHaveBeenCalledWith('/(onboarding)/reciter');
  });

  it('starts the Hafs download on skip', async () => {
    const view = await renderUi(<OnboardingScriptScreen />);

    await fireEvent.press(view.getByTestId('onboarding-skip'));

    expect(startSvgMushafDownload).toHaveBeenCalledWith('hafs');
    expect(router.push).toHaveBeenCalledWith('/(onboarding)/reciter');
  });

  it('caps the content in a 720 pt column on a 1366 pt window, so the radio cards do not stretch', async () => {
    setWindowSize(1366, 1024);
    try {
      const view = await renderUi(<OnboardingScriptScreen />, { locale: 'en' });

      expect(flatStyle(view.getByTestId('onboarding-script-column').props.style)).toMatchObject({ maxWidth: 720 });
    } finally {
      resetWindowSize();
    }
  });

  it('uses theme tokens only', () => {
    expect(featureComponentLiterals('features/onboarding/screens/OnboardingScriptScreen.tsx')).toEqual([]);
  });
});

const WINDOWS = {
  short: [874, 402],
  tall: [390, 844],
} as const;

describe.each(Object.entries(WINDOWS))('in a %s window', (_name, [width, height]) => {
  beforeEach(() => setWindowSize(width, height));
  afterEach(() => resetWindowSize());

  it.each(locales)('keeps the footer below a scrolling body in %s', async (locale) => {
    const view = await renderUi(<OnboardingScriptScreen />, { locale });

    expect(view.getByTestId('onboarding-footer')).toBeOnTheScreen();
    expect(view.getByTestId('onboarding-script-scroll')).toBeOnTheScreen();
    expect(view.getByTestId('onboarding-script-scroll').type).toBe('RCTScrollView');
  });
});
