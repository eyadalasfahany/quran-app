import { router } from 'expo-router';
import { fireEvent, screen } from '@testing-library/react-native';

import { storage, storageKeys } from '@/core/storage/mmkv';
import { resetReaderSettingsStore, useReaderSettings } from '@/features/reader/settings';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { resetWindowSize, setWindowSize } from '../../../../jest/window-size';

import { OnboardingScriptScreen } from './OnboardingScriptScreen';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() } }));

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

  it.each(locales)('renders the five mushafs in %s', async (locale) => {
    await renderUi(<OnboardingScriptScreen />, { locale });

    for (const key of ['hafs', 'warsh', 'qalun', 'shubah', 'duri']) {
      expect(screen.getByTestId(`mushaf-${key}`)).toBeOnTheScreen();
    }
    expect(screen.getAllByRole('radio')).toHaveLength(5);
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
