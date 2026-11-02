import { fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { renderUi } from '../../../../jest/render-ui';

import { MoonSightingScreen } from './MoonSightingScreen';

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), push: jest.fn(), replace: jest.fn() },
}));

const location: { snapshot: unknown; pending: boolean } = { snapshot: null, pending: false };

jest.mock('@/features/moon/hooks/useMoonLocation', () => ({
  useMoonLocation: () => ({ ...location, refresh: async () => {} }),
}));

const MAKKAH = {
  coords: { lat: 21.4225, lng: 39.8262 },
  cityName: { ar: 'مكة المكرمة', en: 'Makkah' },
  source: 'manual',
};

// A Monday evening in the Umm al-Qura month that holds the conjunction in the frame, well after a new moon.
const NOW = new Date(2026, 10, 9, 12, 0);

describe('MoonSightingScreen', () => {
  beforeEach(() => {
    location.snapshot = null;
    location.pending = false;
  });

  it('shows no-location when coords are missing', async () => {
    const view = await renderUi(<MoonSightingScreen now={NOW} />);
    expect(view.getByTestId('moon-no-location')).toBeOnTheScreen();
    expect(view.queryByTestId('moon-location-pill')).toBeNull();
  });

  describe('with a location, in Arabic', () => {
    beforeEach(() => {
      location.snapshot = MAKKAH;
    });

    it('shows the frame rows and copy', async () => {
      const view = await renderUi(<MoonSightingScreen now={NOW} />);
      expect(view.getByRole('button', { name: 'الموقع: مكة المكرمة' })).toBeOnTheScreen();
      expect(view.getByText('عمر القمر عند الغروب')).toBeOnTheScreen();
      expect(view.getByText('نسبة الإضاءة')).toBeOnTheScreen();
      expect(view.getByText('الاقتران (المحاق)')).toBeOnTheScreen();
      expect(view.getByText('غروب الشمس')).toBeOnTheScreen();
      expect(view.getByText('غروب القمر')).toBeOnTheScreen();
      expect(view.getByText('غروب القمر مقارنةً بالشمس')).toBeOnTheScreen();
      expect(view.getByText('الاقتران التالي')).toBeOnTheScreen();
      expect(view.getByText('تقدير إمكان الرؤية')).toBeOnTheScreen();
      expect(view.getByText('المعيار: عودة (Odeh) ٢٠٠٤')).toBeOnTheScreen();
      expect(view.getByText('يُحسب على جهازك دون إنترنت.')).toBeOnTheScreen();
      expect(view.getByTestId('moon-disclaimer')).toBeOnTheScreen();
    });

    it('shows no Latin digits in the Arabic copy', async () => {
      const view = await renderUi(<MoonSightingScreen now={NOW} />);
      const digitTexts = view.queryAllByText(/[0-9]/);
      expect(digitTexts).toHaveLength(0);
    });

    it('opens Salah when the location pill is pressed', async () => {
      const view = await renderUi(<MoonSightingScreen now={NOW} />);
      fireEvent.press(view.getByRole('button', { name: 'الموقع: مكة المكرمة' }));
      expect(router.push).toHaveBeenCalledWith('/salah');
    });
  });

  describe('with a location, in English', () => {
    beforeEach(() => {
      location.snapshot = MAKKAH;
    });

    it('shows the English frame copy', async () => {
      const view = await renderUi(<MoonSightingScreen now={NOW} />, { locale: 'en' });
      expect(view.getByRole('button', { name: 'Location: Makkah' })).toBeOnTheScreen();
      expect(view.getByText('Moon age at sunset')).toBeOnTheScreen();
      expect(view.getByText('Illuminated')).toBeOnTheScreen();
      expect(view.getByText('Conjunction (new moon)')).toBeOnTheScreen();
      expect(view.getByText('Sunset')).toBeOnTheScreen();
      expect(view.getByText('Moonset')).toBeOnTheScreen();
      expect(view.getByText('Moonset compared with sunset')).toBeOnTheScreen();
      expect(view.getByText('Next conjunction')).toBeOnTheScreen();
      expect(view.getByText('Visibility estimate')).toBeOnTheScreen();
      expect(view.getByText('Criterion: Odeh (2004)')).toBeOnTheScreen();
      expect(view.getByText('Calculated on your device, no internet needed.')).toBeOnTheScreen();
    });

    it('shows the time values with AM or PM', async () => {
      const view = await renderUi(<MoonSightingScreen now={NOW} />, { locale: 'en' });
      expect(view.getByTestId('moon-times-card-sunset-value')).toHaveTextContent(/[AP]M$/);
      expect(view.getByTestId('moon-times-card-nextConjunction-value')).toHaveTextContent(
        /^[A-Z][a-z]{2} \d{1,2} · \d{1,2}:\d{2}\s?(AM|PM)$/,
      );
    });
  });

  it('shows the pending state without the no-location card while the location loads', async () => {
    location.pending = true;
    const view = await renderUi(<MoonSightingScreen now={NOW} />);
    expect(view.queryByTestId('moon-no-location')).toBeNull();
  });
});
