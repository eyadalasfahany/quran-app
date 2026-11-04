import { screen } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import * as duasHooks from '../data/hooks';
import { DuaHadithDetailScreen } from './DuaHadithDetailScreen';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), push: jest.fn(), replace: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});

jest.mock('../data/hooks', () => ({
  usePropheticDua: jest.fn(),
}));

const mocked = duasHooks as jest.Mocked<typeof duasHooks>;

const FIXTURE = {
  duaKey: 'hadeethenc:1',
  position: 2,
  groupId: 1,
  title: 'FIXTURE title — not a dua',
  hadeeth: 'FIXTURE text 1 — not a dua',
  attribution: 'FIXTURE attribution — not a dua',
  grade: null,
  explanation: null,
  reference: null,
  hints: null,
  sourceUrl: 'https://hadeethenc.com/ar/browse/hadith/1',
  index: 1,
  total: 1,
  links: [],
};

describe('DuaHadithDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocked.usePropheticDua.mockReturnValue(undefined);
  });

  it('renders the reader shell when dua is missing', async () => {
    await renderUi(<DuaHadithDetailScreen duaKey="missing" />);
    expect(screen.getByTestId('screen-dua-hadith-detail')).toBeOnTheScreen();
  });

  it('renders body text from data', async () => {
    mocked.usePropheticDua.mockReturnValue(FIXTURE);
    await renderUi(<DuaHadithDetailScreen duaKey={FIXTURE.duaKey} />);
    expect(screen.getByText(FIXTURE.hadeeth)).toBeOnTheScreen();
    expect(screen.getByTestId('dua-hadith-open-source')).toBeOnTheScreen();
  });
});
