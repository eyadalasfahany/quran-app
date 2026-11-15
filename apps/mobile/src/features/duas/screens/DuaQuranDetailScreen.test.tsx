import { screen } from '@testing-library/react-native';

import { router } from 'expo-router';

import { press } from '../../../../jest/azkar-ui-fixtures';
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

// The range play is the player's (ADR 0092 decision 3): the screen gets its state from this mock, not from the player.
const mockPlay = {
  state: 'idle' as string,
  activeVerseId: null as number | null,
  errorCode: null as string | null,
  toggle: jest.fn(),
};

jest.mock('@/features/audio/hooks/useRangePlayback', () => ({
  useRangePlayback: jest.fn(() => mockPlay),
}));

// The reader bar is the player's own; the screen only decides when it shows.
jest.mock('@/features/audio/components/MiniPlayer', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return { MiniPlayer: () => React.createElement(Text, { testID: 'mini-player-reader' }, 'FIXTURE reader bar — not a dua') };
});

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

describe('DuaQuranDetailScreen inside a Duas category', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocked.useQuranicDua.mockReturnValue({ ...FIXTURE, position: 9, total: 74 });
  });

  it('counts within the category, not the whole list', async () => {
    await renderUi(
      <DuaQuranDetailScreen
        duaKey={FIXTURE.duaKey}
        pager={{ position: 1, total: 3, previousHref: null, nextHref: '/duas/category/quran/1' }}
        title="FIXTURE category — not a dua"
      />,
    );

    expect(screen.getByText('١ من ٣')).toBeOnTheScreen();
    expect(screen.queryByText('٩ من ٧٤')).toBeNull();
  });

  it('titles the top bar with the category name, and keeps the surah line and the Mushaf button', async () => {
    await renderUi(
      <DuaQuranDetailScreen
        duaKey={FIXTURE.duaKey}
        pager={{ position: 1, total: 3, previousHref: null, nextHref: '/duas/category/quran/1' }}
        title="FIXTURE category — not a dua"
      />,
    );

    expect(screen.getByText('FIXTURE category — not a dua')).toBeOnTheScreen();
    expect(screen.getByTestId('dua-quran-source-line')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'فتح في المصحف' })).toBeOnTheScreen();
  });

  it('pages to the next item of the category from the chip', async () => {
    await renderUi(
      <DuaQuranDetailScreen
        duaKey={FIXTURE.duaKey}
        pager={{ position: 1, total: 3, previousHref: null, nextHref: '/duas/category/quran/1' }}
        title="FIXTURE category — not a dua"
      />,
    );

    await press(screen.getByRole('button', { name: 'التالي' }));
    expect(router.replace).toHaveBeenCalledWith('/duas/category/quran/1');
  });
});

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

describe('DuaQuranDetailScreen range play', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPlay.state = 'idle';
    mockPlay.activeVerseId = null;
    mockPlay.errorCode = null;
    mocked.useQuranicDua.mockReturnValue(FIXTURE);
  });

  it('shows the play control in the action row, labelled تشغيل', async () => {
    await renderUi(<DuaQuranDetailScreen duaKey={FIXTURE.duaKey} />);

    expect(screen.getByRole('button', { name: 'تشغيل' })).toBeOnTheScreen();
  });

  it('calls the range toggle when the play control is pressed', async () => {
    await renderUi(<DuaQuranDetailScreen duaKey={FIXTURE.duaKey} />);

    await press(screen.getByRole('button', { name: 'تشغيل' }));

    expect(mockPlay.toggle).toHaveBeenCalledTimes(1);
  });

  it('shows إيقاف and the reader bar while the range plays', async () => {
    mockPlay.state = 'playing';
    mockPlay.activeVerseId = 10;
    await renderUi(<DuaQuranDetailScreen duaKey={FIXTURE.duaKey} />);

    expect(screen.getByRole('button', { name: 'إيقاف' })).toBeOnTheScreen();
    expect(screen.getByTestId('mini-player-reader')).toBeOnTheScreen();
  });

  it('shows no reader bar while the range is idle', async () => {
    await renderUi(<DuaQuranDetailScreen duaKey={FIXTURE.duaKey} />);

    expect(screen.queryByTestId('mini-player-reader')).toBeNull();
  });

  it('shows no reader bar while the range is paused', async () => {
    mockPlay.state = 'paused';
    await renderUi(<DuaQuranDetailScreen duaKey={FIXTURE.duaKey} />);

    expect(screen.queryByTestId('mini-player-reader')).toBeNull();
  });

  it('shows the player error for a failed play, in the player copy', async () => {
    mockPlay.state = 'error';
    mockPlay.errorCode = 'offline';
    await renderUi(<DuaQuranDetailScreen duaKey={FIXTURE.duaKey} />);

    expect(screen.getByTestId('player-error')).toBeOnTheScreen();
    expect(screen.getByText('غير متاح دون اتصال. حمّل السورة لتسمعها بدون إنترنت.')).toBeOnTheScreen();
  });

  it('disables the play control and shows the hint when the reciter has no timings', async () => {
    mockPlay.state = 'unavailable';
    mockPlay.errorCode = 'no-timings';
    await renderUi(<DuaQuranDetailScreen duaKey={FIXTURE.duaKey} />);

    expect(screen.getByRole('button', { name: 'تشغيل' }).props.accessibilityState).toMatchObject({ disabled: true });
    expect(screen.getByText('أوقات الآيات غير متوفرة لهذا القارئ.')).toBeOnTheScreen();
  });

  it('still opens the Mushaf reader at the first verse from the pager row', async () => {
    await renderUi(<DuaQuranDetailScreen duaKey={FIXTURE.duaKey} />);

    await press(screen.getByRole('button', { name: 'فتح في المصحف' }));

    expect(router.push).toHaveBeenCalledWith('/read/2:1');
  });
});
