import { screen } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import * as duasHooks from '../data/hooks';
import { DuaQuranDetailScreen } from './DuaQuranDetailScreen';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), push: jest.fn(), replace: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});

jest.mock('../data/hooks', () => ({
  useQuranicDua: jest.fn(),
  useIsDuaFavorite: jest.fn(() => false),
}));

const mocked = duasHooks as jest.Mocked<typeof duasHooks>;

// Fixture position only: no Quran text is written here; the verses come from content.db, which the test leaves empty.
const FIXTURE = {
  duaKey: 'quran:2:1',
  position: 5,
  surah: 2,
  verseFrom: 1,
  verseTo: 1,
  total: 74,
};

// Source names and credits. The surah and verse line stays; none of these may render (developer, 15 Nov 2026).
const SOURCE_TEXT = /المصادر|المصدر|المصدر والتفاصيل|HadeethEnc|حصن المسلم|Hisn|Source|فتح على/;

describe('DuaQuranDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocked.useQuranicDua.mockReturnValue(undefined);
  });

  it('renders the reader shell when the dua is missing, titled with the list title', async () => {
    await renderUi(<DuaQuranDetailScreen duaKey="missing" />);

    expect(screen.getByTestId('screen-dua-quran-detail')).toBeOnTheScreen();
    expect(screen.getByText('الأدعية القرآنية')).toBeOnTheScreen();
  });

  it('shows the open-in-Mushaf button and the surah and verse line', async () => {
    mocked.useQuranicDua.mockReturnValue(FIXTURE);
    await renderUi(<DuaQuranDetailScreen duaKey={FIXTURE.duaKey} />);

    expect(screen.getByRole('button', { name: 'فتح في المصحف' })).toBeOnTheScreen();
    expect(screen.getByTestId('dua-quran-source-line')).toBeOnTheScreen();
  });

  it('shows no source text, no source link and no details link', async () => {
    mocked.useQuranicDua.mockReturnValue(FIXTURE);
    await renderUi(<DuaQuranDetailScreen duaKey={FIXTURE.duaKey} />);

    expect(screen.queryByText(SOURCE_TEXT)).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('shows the action row, and opens the text size control on its Aa button', async () => {
    mocked.useQuranicDua.mockReturnValue(FIXTURE);
    await renderUi(<DuaQuranDetailScreen duaKey={FIXTURE.duaKey} />);

    expect(screen.getByRole('button', { name: 'إضافة إلى المفضلة' })).toBeOnTheScreen();
    expect(screen.queryByTestId('azkar-text-size')).toBeNull();
  });
});
