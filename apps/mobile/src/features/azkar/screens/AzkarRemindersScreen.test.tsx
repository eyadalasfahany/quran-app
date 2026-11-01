import { screen } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import { useAzkarCategories } from '../data';
import { useNotificationsGranted } from '../reminders/hooks';
import type { AzkarCategoryListItem } from '../data/model';

import { AzkarRemindersScreen } from './AzkarRemindersScreen';

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: { push: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false), replace: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});

jest.mock('../data', () => ({
  ...jest.requireActual('../data'),
  useAzkarCategories: jest.fn(),
}));

// The user database is not open under Jest: the reminder hooks are stubbed, the rows render with no saved reminder.
jest.mock('../reminders/hooks', () => ({
  useAzkarReminder: jest.fn(() => null),
  useHasReminderLocation: jest.fn(() => true),
  useNotificationsGranted: jest.fn(() => ({ granted: true, refresh: jest.fn() })),
}));

function category(id: string, kind: 'session' | 'browse', position: number): AzkarCategoryListItem {
  return { resourceId: -1, id, kind, position, occasion: null, progressPeriod: 'session', unitCount: 1 } as AzkarCategoryListItem;
}

const CATEGORIES = [
  category('morning', 'session', 1),
  category('evening', 'session', 2),
  category('travel', 'browse', 3),
];

describe('AzkarRemindersScreen', () => {
  beforeEach(() => {
    jest.mocked(useAzkarCategories).mockReturnValue(CATEGORIES);
    jest.mocked(useNotificationsGranted).mockReturnValue({ granted: true, refresh: jest.fn() });
  });

  it('lists the session categories, each with its own reminder, and always shows the disclaimer', async () => {
    await renderUi(<AzkarRemindersScreen />);

    expect(screen.getByText('وقت التذكير من اختيارك، وليس وقتًا محددًا للذكر')).toBeOnTheScreen();
    expect(screen.getByTestId('azkar-reminder-morning')).toBeOnTheScreen();
    expect(screen.getByTestId('azkar-reminder-evening')).toBeOnTheScreen();
    expect(screen.queryByTestId('azkar-reminder-travel')).toBeNull();
  });

  it('shows only the category the bell opened it for', async () => {
    await renderUi(<AzkarRemindersScreen categoryId="travel" />);

    expect(screen.getByTestId('azkar-reminder-travel')).toBeOnTheScreen();
    expect(screen.queryByTestId('azkar-reminder-morning')).toBeNull();
  });

  it('shows one entry reminder when opened from the details sheet', async () => {
    await renderUi(<AzkarRemindersScreen entryKey="fixture:entry-001" />);

    expect(screen.getByTestId('azkar-reminder-entry')).toBeOnTheScreen();
    expect(screen.queryByTestId('azkar-reminder-morning')).toBeNull();
  });

  it('shows the denied notice when the system has turned notifications off', async () => {
    jest.mocked(useNotificationsGranted).mockReturnValue({ granted: false, refresh: jest.fn() });
    await renderUi(<AzkarRemindersScreen />);

    expect(screen.getByTestId('azkar-reminders-denied')).toBeOnTheScreen();
  });

  it('hides the denied notice while notifications are allowed', async () => {
    await renderUi(<AzkarRemindersScreen />);

    expect(screen.queryByTestId('azkar-reminders-denied')).toBeNull();
  });
});
