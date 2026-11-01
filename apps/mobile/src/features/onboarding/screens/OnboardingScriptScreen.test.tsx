import { screen } from '@testing-library/react-native';

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
  it.each(locales)('renders the three reading modes in %s', async (locale) => {
    await renderUi(<OnboardingScriptScreen />, { locale });

    expect(screen.getByTestId('onboarding-mode-mushaf')).toBeOnTheScreen();
    expect(screen.getByTestId('onboarding-mode-reading')).toBeOnTheScreen();
    expect(screen.getByTestId('onboarding-mode-focus')).toBeOnTheScreen();
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
