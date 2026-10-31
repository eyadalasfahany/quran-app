import { screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { press } from '../../../../jest/azkar-ui-fixtures';
import { renderUi } from '../../../../jest/render-ui';
import * as hooks from '../data/hooks';
import { AzkarHomeScreen } from './AzkarHomeScreen';

const mockReady = { value: true };

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
}));

jest.mock('@/core/db/content/open', () => ({
  openContentDb: jest.fn(() => ({ executor: {} })),
  useContentDb: () => ({ error: null, ready: mockReady.value }),
}));

jest.mock('../data/hooks', () => ({
  useAzkarAvailable: jest.fn(),
  useAzkarCategories: jest.fn(),
  useAzkarProgressSummaries: jest.fn(),
  useContinueAzkar: jest.fn(),
}));

const mocked = hooks as jest.Mocked<typeof hooks>;

const categories = [
  { id: 'morning', kind: 'session', position: 1, occasion: 'morning', progressPeriod: 'daily', unitCount: 24 },
  { id: 'evening', kind: 'session', position: 2, occasion: 'evening', progressPeriod: 'daily', unitCount: 6 },
  { id: 'travel', kind: 'browse', position: 1, occasion: null, progressPeriod: 'session', unitCount: 5 },
  { id: 'food-and-drink', kind: 'browse', position: 2, occasion: null, progressPeriod: 'session', unitCount: 8 },
  { id: 'fasting', kind: 'browse', position: 3, occasion: null, progressPeriod: 'session', unitCount: 2 },
] as never;

function today() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

describe('AzkarHomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReady.value = true;
    mocked.useAzkarAvailable.mockReturnValue(true);
    mocked.useAzkarCategories.mockReturnValue(categories);
    mocked.useAzkarProgressSummaries.mockReturnValue([]);
    mocked.useContinueAzkar.mockReturnValue(null);
  });

  it('shows the loading skeleton while the content database opens', async () => {
    mockReady.value = false;
    await renderUi(<AzkarHomeScreen />);

    expect(screen.getByTestId('azkar-home-skeleton')).toBeOnTheScreen();
    expect(screen.queryByTestId('azkar-session-heading')).toBeNull();
  });

  it('shows the unavailable state without Azkar content and no header actions', async () => {
    mocked.useAzkarAvailable.mockReturnValue(false);
    await renderUi(<AzkarHomeScreen />);

    expect(screen.getByRole('header', { name: 'الأذكار غير متاحة بعد' })).toBeOnTheScreen();
    expect(screen.queryByTestId('azkar-session-heading')).toBeNull();
    expect(screen.queryByRole('button', { name: 'بحث' })).toBeNull();
  });

  it('lists the session categories with their progress and the browse topics with counts', async () => {
    mocked.useAzkarProgressSummaries.mockReturnValue([
      { scopeKey: 'category:morning', periodKey: today(), completedUnits: 12, updatedAt: 1 },
    ]);
    await renderUi(<AzkarHomeScreen />);

    expect(screen.getByRole('header', { name: 'أذكار اليوم' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'أذكار الصباح, ١٢ من ٢٤' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'أذكار المساء, ٠ من ٦' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'المواضيع' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'السفر, ٥ أذكار' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'الطعام والشراب, ٨ أذكار' })).toBeOnTheScreen();
  });

  it('marks a finished session as completed', async () => {
    mocked.useAzkarProgressSummaries.mockReturnValue([
      { scopeKey: 'category:evening', periodKey: today(), completedUnits: 6, updatedAt: 1 },
    ]);
    await renderUi(<AzkarHomeScreen />);

    expect(screen.getByRole('button', { name: 'أذكار المساء, ٦ من ٦, مكتمل' })).toBeOnTheScreen();
  });

  it('shows the continue card for the scope in progress and opens its reader', async () => {
    mocked.useContinueAzkar.mockReturnValue({
      completed: 12,
      scope: {
        scopeKey: 'category:morning',
        periodKey: today(),
        total: 24,
        categoryId: 'morning',
        entryKey: null,
        occasion: 'morning',
      },
    });
    await renderUi(<AzkarHomeScreen />);

    await press(screen.getByRole('button', { name: 'تابع, أذكار الصباح, ١٢ من ٢٤' }));
    expect(router.push).toHaveBeenLastCalledWith('/azkar/read/morning');
  });

  it('opens the category, favourites and search from the screen', async () => {
    await renderUi(<AzkarHomeScreen />);

    await press(screen.getByRole('button', { name: 'أذكار المساء, ٠ من ٦' }));
    expect(router.push).toHaveBeenLastCalledWith('/azkar/category/evening');

    await press(screen.getByRole('button', { name: 'السفر, ٥ أذكار' }));
    expect(router.push).toHaveBeenLastCalledWith('/azkar/category/travel');

    await press(screen.getByRole('button', { name: 'المفضلة' }));
    expect(router.push).toHaveBeenLastCalledWith('/azkar/favorites');

    await press(screen.getByRole('button', { name: 'بحث' }));
    expect(router.push).toHaveBeenLastCalledWith('/azkar/search');
  });

  it('renders in English with the English labels', async () => {
    await renderUi(<AzkarHomeScreen />, { locale: 'en' });

    expect(screen.getByRole('header', { name: "Today's azkar" })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Travel, 5 dhikr' })).toBeOnTheScreen();
  });
});
