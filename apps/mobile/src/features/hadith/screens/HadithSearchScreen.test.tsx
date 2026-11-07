import { screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { locales, renderUi } from '../../../../jest/render-ui';
import { press } from '../../../../jest/azkar-ui-fixtures';

import { HadithSearchScreen } from './HadithSearchScreen';

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), push: jest.fn(), replace: jest.fn() },
}));

describe('HadithSearchScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(locales)('renders the search field and cancel in Arabic and English (%s)', async (locale) => {
    await renderUi(<HadithSearchScreen />, { locale });
    expect(screen.getByTestId('screen-hadith-search')).toBeOnTheScreen();
    expect(screen.getByPlaceholderText(locale === 'ar' ? 'ابحث في الحديث' : 'Search hadith')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: locale === 'ar' ? 'إلغاء' : 'Cancel' })).toBeOnTheScreen();
  });

  it('cancel goes back', async () => {
    await renderUi(<HadithSearchScreen />);
    await press(screen.getByRole('button', { name: 'إلغاء' }));
    expect(router.back).toHaveBeenCalledTimes(1);
  });
});
