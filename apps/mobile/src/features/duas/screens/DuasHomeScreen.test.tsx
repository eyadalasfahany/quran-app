import { screen } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import * as azkarData from '@/features/azkar/data';
import { DuasHomeScreen } from './DuasHomeScreen';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), push: jest.fn(), replace: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});

jest.mock('@/features/azkar/data', () => ({
  useAzkarAvailable: jest.fn(),
  useAzkarCategories: jest.fn(),
}));

const mocked = azkarData as jest.Mocked<typeof azkarData>;

describe('DuasHomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocked.useAzkarAvailable.mockReturnValue(true);
    mocked.useAzkarCategories.mockReturnValue([
      { id: 'travel', kind: 'browse', position: 1, occasion: null, progressPeriod: 'session', unitCount: 5 },
    ] as never);
  });

  it('always shows the mine card', async () => {
    mocked.useAzkarAvailable.mockReturnValue(false);
    await renderUi(<DuasHomeScreen />);
    expect(screen.getByTestId('duas-mine-card')).toBeOnTheScreen();
    expect(screen.queryByTestId('duas-source-hisn')).toBeNull();
  });

  it('shows Hisn and topics when Azkar is available', async () => {
    await renderUi(<DuasHomeScreen />);
    expect(screen.getByTestId('duas-source-hisn')).toBeOnTheScreen();
    expect(screen.getByTestId('duas-topic-travel')).toBeOnTheScreen();
  });
});
