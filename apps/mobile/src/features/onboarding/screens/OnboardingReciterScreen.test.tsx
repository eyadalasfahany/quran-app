import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { resetWindowSize, setWindowSize } from '../../../../jest/window-size';

import { OnboardingReciterScreen } from './OnboardingReciterScreen';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() } }));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
  };
});

// The catalogue reads the content database, which is unavailable under Jest; an empty list keeps the screen's chrome under test.
jest.mock('@/features/audio/hooks/useReciterCatalogue', () => ({
  useReciterCatalogue: () => ({ reciters: [], selectedId: null, playingId: null }),
}));

describe('OnboardingReciterScreen', () => {
  it.each(locales)('renders the continue button and the reminder card in %s', async (locale) => {
    await renderUi(<OnboardingReciterScreen />, { locale });

    expect(screen.getByTestId('onboarding-daily-reminder')).toBeOnTheScreen();
    expect(screen.getByTestId('onboarding-continue')).toBeOnTheScreen();
  });

  it('caps the content in a 720 pt column on a 1366 pt window, so the reciter rows do not stretch', async () => {
    setWindowSize(1366, 1024);
    try {
      const view = await renderUi(<OnboardingReciterScreen />, { locale: 'en' });

      expect(flatStyle(view.getByTestId('onboarding-reciter-column').props.style)).toMatchObject({ maxWidth: 720 });
    } finally {
      resetWindowSize();
    }
  });

  it('uses theme tokens only', () => {
    expect(featureComponentLiterals('features/onboarding/screens/OnboardingReciterScreen.tsx')).toEqual([]);
  });
});
