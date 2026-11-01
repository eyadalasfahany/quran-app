import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { resetWindowSize, setWindowSize } from '../../../../jest/window-size';

import { OnboardingLanguageScreen } from './OnboardingLanguageScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
  };
});

const TAGLINE = 'مصحفك، بهدوء. اقرأ واستمع واحفظ.';
const TAGLINE_EN = 'Your Quran, calmly. Read, listen and memorize.';

describe('OnboardingLanguageScreen', () => {
  it('shows the English tagline once in English, not twice', async () => {
    await renderUi(<OnboardingLanguageScreen />, { locale: 'en' });

    expect(screen.getAllByText(TAGLINE_EN)).toHaveLength(1);
  });

  it('shows the Arabic tagline with its English gloss below it in Arabic', async () => {
    await renderUi(<OnboardingLanguageScreen />, { locale: 'ar' });

    expect(screen.getByText(TAGLINE)).toBeOnTheScreen();
    expect(screen.getByText(TAGLINE_EN)).toBeOnTheScreen();
  });

  it.each(locales)('renders the language choices in %s', async (locale) => {
    await renderUi(<OnboardingLanguageScreen />, { locale });

    expect(screen.getByTestId('onboarding-locale-ar')).toBeOnTheScreen();
    expect(screen.getByTestId('onboarding-locale-en')).toBeOnTheScreen();
  });

  it('caps the content in a 720 pt column on a 1366 pt window, so the radio cards do not stretch', async () => {
    setWindowSize(1366, 1024);
    try {
      const view = await renderUi(<OnboardingLanguageScreen />, { locale: 'en' });

      expect(flatStyle(view.getByTestId('onboarding-language-column').props.style)).toMatchObject({ maxWidth: 720 });
      expect(view.getByTestId('onboarding-locale-en')).toBeOnTheScreen();
    } finally {
      resetWindowSize();
    }
  });

  it('uses theme tokens only', () => {
    expect(featureComponentLiterals('features/onboarding/screens/OnboardingLanguageScreen.tsx')).toEqual([]);
  });
});
