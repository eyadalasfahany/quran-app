import { screen } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import * as azkarData from '@/features/azkar/data';
import * as duasHooks from '../data/hooks';
import { DuasHomeScreen } from './DuasHomeScreen';

const mockedDuasHooks = duasHooks as jest.Mocked<typeof duasHooks>;

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

jest.mock('../data/hooks', () => ({
  usePropheticDuasAvailable: jest.fn(),
  useQuranicDuasAvailable: jest.fn(),
}));

const mocked = azkarData as jest.Mocked<typeof azkarData>;

function sourceOrder(): string[] {
  const ids: string[] = [];
  const walk = (node: unknown): void => {
    if (node === null || typeof node !== 'object') {
      return;
    }
    const record = node as { props?: { testID?: string; children?: unknown }; children?: unknown };
    const testID = record.props?.testID;
    if (typeof testID === 'string' && testID.startsWith('duas-source-')) {
      ids.push(testID);
    }
    const children = record.children ?? record.props?.children;
    if (Array.isArray(children)) {
      children.forEach(walk);
    } else if (children !== undefined) {
      walk(children);
    }
  };
  walk(screen.getByTestId('screen-duas-home'));
  return ids;
}

describe('DuasHomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedDuasHooks.useQuranicDuasAvailable.mockReturnValue(false);
    mockedDuasHooks.usePropheticDuasAvailable.mockReturnValue(false);
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
    expect(screen.getByTestId('duas-source-hadith-pending')).toBeOnTheScreen();
  });

  it('shows the Quranic source row when Quranic duas exist', async () => {
    mockedDuasHooks.useQuranicDuasAvailable.mockReturnValue(true);
    mocked.useAzkarAvailable.mockReturnValue(false);
    await renderUi(<DuasHomeScreen />);
    expect(screen.getByTestId('duas-source-quran')).toBeOnTheScreen();
  });

  it('shows Hisn and Hisn topic tiles when Azkar is available', async () => {
    await renderUi(<DuasHomeScreen />);
    expect(screen.getByTestId('duas-source-hisn')).toBeOnTheScreen();
    expect(screen.getByTestId('duas-hisn-topics-heading')).toBeOnTheScreen();
    expect(screen.queryByTestId('duas-topics-heading')).toBeNull();
    expect(screen.getByTestId('duas-topic-travel')).toBeOnTheScreen();
  });

  it('shows the prophetic source row when hadith rows exist', async () => {
    mocked.useAzkarAvailable.mockReturnValue(false);
    mockedDuasHooks.usePropheticDuasAvailable.mockReturnValue(true);
    await renderUi(<DuasHomeScreen />);
    expect(screen.getByTestId('duas-source-hadith')).toBeOnTheScreen();
    expect(screen.queryByTestId('duas-source-hadith-pending')).toBeNull();
  });

  it('lists prophetic before Hisn and Quranic sources', async () => {
    mockedDuasHooks.useQuranicDuasAvailable.mockReturnValue(true);
    mockedDuasHooks.usePropheticDuasAvailable.mockReturnValue(true);
    await renderUi(<DuasHomeScreen />);
    expect(sourceOrder()).toEqual(['duas-source-hadith', 'duas-source-hisn', 'duas-source-quran']);
  });
});
