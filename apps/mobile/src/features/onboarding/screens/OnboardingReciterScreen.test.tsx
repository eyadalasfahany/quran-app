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
const mockCatalogue: { reciters: unknown[]; selectedId: number | null; playingId: number | null } = {
  reciters: [],
  selectedId: null,
  playingId: null,
};

jest.mock('@/features/audio/hooks/useReciterCatalogue', () => ({
  useReciterCatalogue: () => mockCatalogue,
}));

const reciter = (resourceId: number, nameAr: string, name: string) => ({
  hasTimings: true,
  installed: false,
  isDefault: resourceId === 1,
  name,
  nameAr,
  resourceId,
  style: null,
});

describe('OnboardingReciterScreen', () => {
  it.each(locales)('renders the continue button and the reminder card in %s', async (locale) => {
    await renderUi(<OnboardingReciterScreen />, { locale });

    expect(screen.getByTestId('onboarding-daily-reminder')).toBeOnTheScreen();
    expect(screen.getByTestId('onboarding-continue')).toBeOnTheScreen();
  });

  it('lists a normal reciter but not a trial one', async () => {
    mockCatalogue.reciters = [
      reciter(1, 'عبد الباسط عبد الصمد', 'Abdul Basit'),
      reciter(176, 'أحمد عبدالحميد طاحون (تجريبي)', 'Ahmed Tahoun'),
    ];
    mockCatalogue.selectedId = 176;
    try {
      await renderUi(<OnboardingReciterScreen />, { locale: 'en' });

      expect(screen.getByTestId('onboarding-reciter-1')).toBeOnTheScreen();
      expect(screen.queryByTestId('onboarding-reciter-176')).toBeNull();
      // The trial reciter was saved, so the normal default is the one selected.
      expect(screen.getByRole('radio', { checked: true, name: /Abdul Basit/ })).toBeOnTheScreen();
    } finally {
      mockCatalogue.reciters = [];
      mockCatalogue.selectedId = null;
    }
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

const WINDOWS = {
  short: [874, 402],
  tall: [390, 844],
} as const;

describe.each(Object.entries(WINDOWS))('in a %s window', (_name, [width, height]) => {
  beforeEach(() => setWindowSize(width, height));
  afterEach(() => resetWindowSize());

  it.each(locales)('keeps the footer below a scrolling body in %s', async (locale) => {
    const view = await renderUi(<OnboardingReciterScreen />, { locale });

    expect(view.getByTestId('onboarding-footer')).toBeOnTheScreen();
    expect(view.getByTestId('onboarding-reciter-scroll')).toBeOnTheScreen();
    expect(view.getByTestId('onboarding-reciter-scroll').type).toBe('RCTScrollView');
  });
});
