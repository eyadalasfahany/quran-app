import { screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Share } from 'react-native';

import { makeDetail, makeEntry, makeItem, press, textSegment } from '../../../../jest/azkar-ui-fixtures';
import { renderUi } from '../../../../jest/render-ui';
import * as azkarData from '@/features/azkar/data';
import type { DuaPager } from '../data/category-pager';
import { DuaHisnDetailScreen } from './DuaHisnDetailScreen';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), push: jest.fn(), replace: jest.fn() },
}));

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

describe('DuaHisnDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('shows no audio control', async () => {
    setup();
    await renderUi(<DuaHisnDetailScreen entryKey={ENTRY_KEY} pager={PAGER} title="FIXTURE category — not a dua" />);

    expect(screen.queryByTestId('azkar-actions-play')).toBeNull();
    expect(screen.queryByTestId('azkar-download')).toBeNull();
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
