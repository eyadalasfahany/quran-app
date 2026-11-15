import { screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Share } from 'react-native';

import { makeRecording } from '../../../../jest/azkar-audio-fixtures';
import { makeDetail, makeEntry, makeItem, press, textSegment } from '../../../../jest/azkar-ui-fixtures';
import { renderUi } from '../../../../jest/render-ui';
import type { AzkarEntryPlayback } from '@/features/azkar';
import * as azkarData from '@/features/azkar/data';
import type { DuaPager } from '../data/category-pager';
import { DuaHisnDetailScreen } from './DuaHisnDetailScreen';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), push: jest.fn(), replace: jest.fn() },
}));

// The playback comes from the public features/azkar API only (ADR 0092 decision 3). The components stay real.
const mockPlayback = jest.fn();
jest.mock('@/features/azkar', () => {
  const actual = jest.requireActual<typeof import('@/features/azkar')>('@/features/azkar');
  return { ...actual, useAzkarEntryPlayback: (args: unknown) => mockPlayback(args) };
});

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});

// The Azkar data layer is faked; the unit builder is the real one, so the body is built the way the reader builds it.
jest.mock('@/features/azkar/data', () => {
  const actual = jest.requireActual<typeof import('@/features/azkar/data/reader-units')>('@/features/azkar/data/reader-units');
  return {
    buildReaderUnits: actual.buildReaderUnits,
    quranSegmentKey: (segment: { itemId: number; position: number }) => `${segment.itemId}:${segment.position}`,
    resolveQuranVerses: jest.fn(() => new Map()),
    useAzkarFontScale: jest.fn(() => [1, jest.fn()]),
    useEntry: jest.fn(),
    useVariationChoices: jest.fn(() => ({ choices: {}, choose: jest.fn() })),
    useIsFavorite: jest.fn(() => false),
    toggleAzkarFavorite: jest.fn(),
  };
});

const mocked = azkarData as jest.Mocked<typeof azkarData>;

// Fixture text only: no dua is written here.
const TEXT = 'FIXTURE text 1 — not a dua';
const ENTRY_KEY = 'FIXTURE:entry-1';
const PAGER: DuaPager = {
  position: 3,
  total: 5,
  previousHref: '/duas/category/hisn%3Amorning/1',
  nextHref: '/duas/category/hisn%3Amorning/3',
};

// Every credit, reference and counter a source would show. None may render in Duas.
const SOURCE_TEXT = /حصن المسلم|المصدر|المصادر|المرجع|Hisn|Source|Reference|فتح على|المصدر والتفاصيل/;

function entryWith(items: ReturnType<typeof makeItem>[]) {
  return makeDetail({
    entry: makeEntry({ entryKey: ENTRY_KEY }),
    items,
    variations: [],
    activeVariation: 'default',
  });
}

function setup(entry = entryWith([makeItem({ id: 1, segments: [textSegment(TEXT, 1, 1)] })])) {
  mocked.useEntry.mockReturnValue(entry);
}

const PLAY = 'تشغيل التسجيل';
const PAUSE = 'إيقاف التسجيل مؤقتًا';
const DOWNLOAD = 'تنزيل التسجيل';
const OFFLINE = 'غير متاح دون اتصال';

const onToggle = jest.fn();
const BAR_PROPS = {
  playing: true,
  positionMs: 12_000,
  durationMs: 65_000,
  repetition: null,
  canPrevious: true,
  canNext: false,
  onToggle: jest.fn(),
  onPrevious: jest.fn(),
  onNext: jest.fn(),
  onOpen: jest.fn(),
};

/** The playback state the hook gives the screen. The default is an entry with no recording. */
function playback(overrides: Partial<AzkarEntryPlayback> = {}): AzkarEntryPlayback {
  return { recording: null, playControl: null, offline: false, bar: null, ...overrides };
}

/** A downloadable, streamable recording of the fixture item. */
const RECORDING = makeRecording({ downloadAllowed: true });

describe('DuaHisnDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPlayback.mockReturnValue(playback());
  });

  it('renders the Hisn text, in the reader body', async () => {
    setup();
    await renderUi(<DuaHisnDetailScreen entryKey={ENTRY_KEY} pager={PAGER} title="FIXTURE category — not a dua" />);

    expect(screen.getByTestId('screen-dua-hisn-detail')).toBeOnTheScreen();
    expect(screen.getByText(TEXT)).toBeOnTheScreen();
  });

  it('titles the top bar with the category name, and counts within the category', async () => {
    setup();
    await renderUi(<DuaHisnDetailScreen entryKey={ENTRY_KEY} pager={PAGER} title="FIXTURE category — not a dua" />);

    expect(screen.getByText('FIXTURE category — not a dua')).toBeOnTheScreen();
    expect(screen.getByText('٣ من ٥')).toBeOnTheScreen();
  });

  it('shows no counter, no source line and no details link', async () => {
    setup();
    await renderUi(<DuaHisnDetailScreen entryKey={ENTRY_KEY} pager={PAGER} title="FIXTURE category — not a dua" />);

    expect(screen.queryByTestId('azkar-counter')).toBeNull();
    expect(screen.queryByTestId('azkar-source-line')).toBeNull();
    expect(screen.queryByText(SOURCE_TEXT)).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('passes the entry, its units and the category title to the playback API', async () => {
    setup();
    await renderUi(<DuaHisnDetailScreen entryKey={ENTRY_KEY} pager={PAGER} title="FIXTURE category — not a dua" />);

    expect(mockPlayback).toHaveBeenCalledWith(
      expect.objectContaining({ entryKey: ENTRY_KEY, title: 'FIXTURE category — not a dua', units: expect.any(Array) }),
    );
  });

  describe('audio states (frames DuaHisnDetailAudio, AudioPlaying, AudioOffline)', () => {
    it('idle: the action row has play and download, and no player bar or offline pill', async () => {
      setup();
      mockPlayback.mockReturnValue(playback({ recording: RECORDING, playControl: { playing: false, loading: false, onToggle } }));
      await renderUi(<DuaHisnDetailScreen entryKey={ENTRY_KEY} pager={PAGER} title="FIXTURE category — not a dua" />);

      expect(screen.getByRole('button', { name: PLAY })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: DOWNLOAD })).toBeOnTheScreen();
      expect(screen.queryByTestId('dua-hisn-player-bar')).toBeNull();
      expect(screen.queryByText(OFFLINE)).toBeNull();
    });

    it('idle: pressing play calls the playback toggle', async () => {
      setup();
      mockPlayback.mockReturnValue(playback({ recording: RECORDING, playControl: { playing: false, loading: false, onToggle } }));
      await renderUi(<DuaHisnDetailScreen entryKey={ENTRY_KEY} pager={PAGER} title="FIXTURE category — not a dua" />);

      await press(screen.getByRole('button', { name: PLAY }));
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('playing: the player bar shows, and the action row shows pause', async () => {
      setup();
      mockPlayback.mockReturnValue(
        playback({ recording: RECORDING, playControl: { playing: true, loading: false, onToggle }, bar: BAR_PROPS }),
      );
      await renderUi(<DuaHisnDetailScreen entryKey={ENTRY_KEY} pager={PAGER} title="FIXTURE category — not a dua" />);

      expect(screen.getByTestId('dua-hisn-player-bar')).toBeOnTheScreen();
      expect(screen.getAllByRole('button', { name: PAUSE })).toHaveLength(2);
      expect(screen.queryByRole('button', { name: PLAY })).toBeNull();
    });

    it('offline: the offline pill shows, play is hidden, and download stays', async () => {
      setup();
      mockPlayback.mockReturnValue(playback({ recording: RECORDING, offline: true }));
      await renderUi(<DuaHisnDetailScreen entryKey={ENTRY_KEY} pager={PAGER} title="FIXTURE category — not a dua" />);

      expect(screen.getByText(OFFLINE)).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: PLAY })).toBeNull();
      expect(screen.queryByTestId('dua-hisn-player-bar')).toBeNull();
      expect(screen.getByRole('button', { name: DOWNLOAD })).toBeOnTheScreen();
    });

    it('no recording: no play, no download, no pill and no bar', async () => {
      setup();
      await renderUi(<DuaHisnDetailScreen entryKey={ENTRY_KEY} pager={PAGER} title="FIXTURE category — not a dua" />);

      expect(screen.queryByRole('button', { name: PLAY })).toBeNull();
      expect(screen.queryByRole('button', { name: DOWNLOAD })).toBeNull();
      expect(screen.queryByText(OFFLINE)).toBeNull();
      expect(screen.queryByTestId('dua-hisn-player-bar')).toBeNull();
      expect(screen.queryByTestId('dua-hisn-play')).toBeNull();
    });

    it('a recording without download rights keeps play and draws no download', async () => {
      setup();
      mockPlayback.mockReturnValue(
        playback({
          recording: makeRecording({ downloadAllowed: false }),
          playControl: { playing: false, loading: false, onToggle },
        }),
      );
      await renderUi(<DuaHisnDetailScreen entryKey={ENTRY_KEY} pager={PAGER} title="FIXTURE category — not a dua" />);

      expect(screen.getByRole('button', { name: PLAY })).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: DOWNLOAD })).toBeNull();
    });

    it('English: the audio labels and the offline text are English', async () => {
      setup();
      mockPlayback.mockReturnValue(playback({ recording: RECORDING, playControl: { playing: false, loading: false, onToggle } }));
      await renderUi(<DuaHisnDetailScreen entryKey={ENTRY_KEY} pager={PAGER} title="FIXTURE category — not a dua" />, { locale: 'en' });

      expect(screen.getByRole('button', { name: 'Play recording' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Download recording' })).toBeOnTheScreen();
    });

    it('English: the offline pill reads Not available offline', async () => {
      setup();
      mockPlayback.mockReturnValue(playback({ recording: RECORDING, offline: true }));
      await renderUi(<DuaHisnDetailScreen entryKey={ENTRY_KEY} pager={PAGER} title="FIXTURE category — not a dua" />, { locale: 'en' });

      expect(screen.getByText('Not available offline')).toBeOnTheScreen();
    });
  });

  it('pages within the category: next goes to the next item of the category', async () => {
    setup();
    await renderUi(<DuaHisnDetailScreen entryKey={ENTRY_KEY} pager={PAGER} title="FIXTURE category — not a dua" />);

    await press(screen.getByRole('button', { name: 'التالي' }));
    expect(router.replace).toHaveBeenCalledWith('/duas/category/hisn%3Amorning/3');
  });

  it('disables a chip with no neighbour, and keeps it on screen', async () => {
    setup();
    await renderUi(
      <DuaHisnDetailScreen entryKey={ENTRY_KEY} pager={{ ...PAGER, position: 1, previousHref: null }} title="FIXTURE category — not a dua" />,
    );

    expect(screen.getByRole('button', { name: 'السابق' }).props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
  });

  it('saves the Azkar favourite of the entry from its action row', async () => {
    setup();
    await renderUi(<DuaHisnDetailScreen entryKey={ENTRY_KEY} pager={PAGER} title="FIXTURE category — not a dua" />);

    await press(screen.getByRole('button', { name: 'إضافة إلى المفضلة' }));
    expect(mocked.toggleAzkarFavorite).toHaveBeenCalledWith(ENTRY_KEY);
  });

  it('shares the text only, with no source line', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction', activityType: undefined });
    setup();
    await renderUi(<DuaHisnDetailScreen entryKey={ENTRY_KEY} pager={PAGER} title="FIXTURE category — not a dua" />);

    await press(screen.getByRole('button', { name: 'مشاركة' }));
    expect(share).toHaveBeenCalledWith({ message: TEXT });
    share.mockRestore();
  });

  it('opens the text size control on its Aa button', async () => {
    setup();
    await renderUi(<DuaHisnDetailScreen entryKey={ENTRY_KEY} pager={PAGER} title="FIXTURE category — not a dua" />);

    expect(screen.queryByTestId('azkar-text-size')).toBeNull();
    await press(screen.getByRole('button', { name: 'حجم النص' }));
    expect(screen.getByTestId('azkar-text-size')).toBeOnTheScreen();
  });

  it('shows the reader shell with the title when the entry is missing', async () => {
    mocked.useEntry.mockReturnValue(undefined);
    await renderUi(<DuaHisnDetailScreen entryKey="missing" pager={PAGER} title="FIXTURE category — not a dua" />);

    expect(screen.getByTestId('screen-dua-hisn-detail')).toBeOnTheScreen();
    expect(screen.getByText('FIXTURE category — not a dua')).toBeOnTheScreen();
    expect(screen.queryByText(TEXT)).toBeNull();
  });

  it('renders under English too, with the English progress', async () => {
    setup();
    await renderUi(<DuaHisnDetailScreen entryKey={ENTRY_KEY} pager={PAGER} title="FIXTURE category — not a dua" />, { locale: 'en' });

    expect(screen.getByText('3 of 5')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Next' })).toBeOnTheScreen();
  });
});
