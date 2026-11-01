import { screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { makeItem, makeUnit, press } from '../../../../jest/azkar-ui-fixtures';
import { renderUi } from '../../../../jest/render-ui';
import * as hooks from '../data/hooks';
import { AzkarCategoryScreen } from './AzkarCategoryScreen';

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), push: jest.fn(), replace: jest.fn() },
}));

jest.mock('@/core/db/content/open', () => ({
  openContentDb: jest.fn(() => ({ executor: {} })),
}));

jest.mock('../data/hooks', () => ({
  useAzkarCategory: jest.fn(),
  useCategoryUnits: jest.fn(),
  useScopeProgress: jest.fn(),
}));

const mocked = hooks as jest.Mocked<typeof hooks>;

// Two entries: the first has two units (a counted dhikr and its follow-up), the second one counted unit.
const units = [
  makeUnit({
    unitKey: 'fixture:item-1',
    entryKey: 'fixture:entry-001',
    requiredCount: 3,
    body: [makeItem({ id: 1, requiredCount: 3 })],
  }),
  makeUnit({
    unitKey: 'fixture:item-2',
    entryKey: 'fixture:entry-001',
    requiredCount: 2,
    body: [makeItem({ id: 2, requiredCount: 2 })],
  }),
  makeUnit({
    unitKey: 'fixture:item-3',
    entryKey: 'fixture:entry-002',
    requiredCount: null,
    body: [makeItem({ id: 3, requiredCount: null })],
  }),
];

function rowFor(itemKey: string, completed: boolean) {
  return {
    scopeKey: 'category:morning',
    periodKey: 'daily',
    itemKey,
    currentCount: completed ? 1 : 0,
    completedAt: completed ? 1 : null,
    updatedAt: 1,
  };
}

describe('AzkarCategoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocked.useAzkarCategory.mockReturnValue({
      resourceId: -1,
      id: 'morning',
      kind: 'session',
      position: 1,
      occasion: 'morning',
      progressPeriod: 'daily',
    });
    mocked.useCategoryUnits.mockReturnValue(units);
    mocked.useScopeProgress.mockReturnValue({ data: [] } as never);
  });

  it('shows the title, the sourced line and the progress count', async () => {
    await renderUi(<AzkarCategoryScreen categoryId="morning" />);

    expect(screen.getByRole('header', { name: 'أذكار الصباح' })).toBeOnTheScreen();
    expect(screen.getByText('حصن المسلم · ٣ أذكار')).toBeOnTheScreen();
    expect(screen.getByText('٠ من ٣')).toBeOnTheScreen();
  });

  it('shows one card per entry, numbered in order, with its sourced count', async () => {
    await renderUi(<AzkarCategoryScreen categoryId="morning" />);

    expect(screen.getByTestId('azkar-category-card-1')).toBeOnTheScreen();
    expect(screen.getByTestId('azkar-category-card-2')).toBeOnTheScreen();
    expect(screen.queryByTestId('azkar-category-card-3')).toBeNull();
    expect(screen.getAllByTestId('azkar-count-chip')).toHaveLength(1);
  });

  it('marks an entry done when all its units are completed and counts the progress', async () => {
    mocked.useScopeProgress.mockReturnValue({
      data: [rowFor('fixture:item-1', true), rowFor('fixture:item-2', true)],
    } as never);
    await renderUi(<AzkarCategoryScreen categoryId="morning" />);

    expect(screen.getByText('٢ من ٣')).toBeOnTheScreen();
    expect(screen.getByTestId('azkar-category-card-1-done', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'تابع' })).toBeOnTheScreen();
  });

  it('starts from the first card and opens the reader at its unit', async () => {
    await renderUi(<AzkarCategoryScreen categoryId="morning" />);

    await press(screen.getByTestId('azkar-category-card-2'));
    expect(router.push).toHaveBeenLastCalledWith('/azkar/read/morning?unit=fixture%3Aitem-3');
  });

  it('pins a start button that opens the reader for the category', async () => {
    await renderUi(<AzkarCategoryScreen categoryId="morning" />);

    await press(screen.getByRole('button', { name: 'ابدأ' }));
    expect(router.push).toHaveBeenLastCalledWith('/azkar/read/morning');
  });

  it('renders the English labels', async () => {
    await renderUi(<AzkarCategoryScreen categoryId="morning" />, { locale: 'en' });

    expect(screen.getByText('Hisn al-Muslim · 3 dhikr')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Start' })).toBeOnTheScreen();
  });
});
