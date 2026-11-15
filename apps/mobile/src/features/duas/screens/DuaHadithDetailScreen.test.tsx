import { screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { press } from '../../../../jest/azkar-ui-fixtures';
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
  useIsDuaFavorite: jest.fn(() => false),
}));

const mocked = duasHooks as jest.Mocked<typeof duasHooks>;

const FIXTURE_HINTS = ['FIXTURE hint 1 — not a dua', 'FIXTURE hint 2 — not a dua'];

const FIXTURE = {
  duaKey: 'hadeethenc:1',
  position: 2,
  groupId: 1,
  title: 'FIXTURE title — not a dua',
  hadeeth: 'FIXTURE text 1 — not a dua',
  attribution: 'FIXTURE attribution — not a dua',
  grade: 'FIXTURE grade — not a dua',
  explanation: 'FIXTURE explanation — not a dua',
  reference: 'FIXTURE reference — not a dua',
  hints: FIXTURE_HINTS,
  sourceUrl: 'https://hadeethenc.com/ar/browse/hadith/1',
  index: 1,
  total: 1,
};

// Every credit, reference and grade text a source would show. None may render on this screen.
const SOURCE_TEXT = /المصدر|HadeethEnc|المرجع|الدرجة|فتح على|FIXTURE attribution|FIXTURE reference|FIXTURE grade/;

describe('DuaHadithDetailScreen inside a Duas category', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocked.usePropheticDua.mockReturnValue({ ...FIXTURE, index: 45, total: 45 });
  });

  it('counts within the category, not the whole list (position of the category, not the dua index)', async () => {
    await renderUi(
      <DuaHadithDetailScreen
        duaKey={FIXTURE.duaKey}
        pager={{ position: 2, total: 41, previousHref: '/duas/category/x/0', nextHref: '/duas/category/x/2' }}
        title="FIXTURE category — not a dua"
      />,
    );
    expect(screen.getByText('٢ من ٤١')).toBeOnTheScreen();
    expect(screen.queryByText('٤٥ من ٤٥')).toBeNull();
  });

  it('titles the top bar with the category name', async () => {
    await renderUi(
      <DuaHadithDetailScreen
        duaKey={FIXTURE.duaKey}
        pager={{ position: 1, total: 2, previousHref: null, nextHref: '/duas/category/x/1' }}
        title="FIXTURE category — not a dua"
      />,
    );
    expect(screen.getByText('FIXTURE category — not a dua')).toBeOnTheScreen();
    expect(screen.queryByText('الأدعية النبوية')).toBeNull();
  });

  it('pages to the next item of the category, and disables previous on the first', async () => {
    await renderUi(
      <DuaHadithDetailScreen
        duaKey={FIXTURE.duaKey}
        pager={{ position: 1, total: 2, previousHref: null, nextHref: '/duas/category/x/1' }}
        title="FIXTURE category — not a dua"
      />,
    );
    expect(screen.getByRole('button', { name: 'السابق' }).props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
    await press(screen.getByRole('button', { name: 'التالي' }));
    expect(router.replace).toHaveBeenCalledWith('/duas/category/x/1');
  });

  it('shows no source text inside a category either', async () => {
    await renderUi(
      <DuaHadithDetailScreen
        duaKey={FIXTURE.duaKey}
        pager={{ position: 1, total: 2, previousHref: null, nextHref: '/duas/category/x/1' }}
        title="FIXTURE category — not a dua"
      />,
    );
    expect(screen.queryByText(SOURCE_TEXT)).toBeNull();
  });
});

describe('DuaHadithDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocked.usePropheticDua.mockReturnValue(undefined);
  });

  it('renders the reader shell when dua is missing, titled with the list title', async () => {
    await renderUi(<DuaHadithDetailScreen duaKey="missing" />);
    expect(screen.getByTestId('screen-dua-hadith-detail')).toBeOnTheScreen();
    expect(screen.getByText('الأدعية النبوية')).toBeOnTheScreen();
  });

  it('titles the top bar with the list title, not the dua title', async () => {
    mocked.usePropheticDua.mockReturnValue(FIXTURE);
    await renderUi(<DuaHadithDetailScreen duaKey={FIXTURE.duaKey} />);
    expect(screen.getByText('الأدعية النبوية')).toBeOnTheScreen();
    expect(screen.queryByText(FIXTURE.title)).toBeNull();
  });

  it('renders the text and the meaning and benefits sections', async () => {
    mocked.usePropheticDua.mockReturnValue(FIXTURE);
    await renderUi(<DuaHadithDetailScreen duaKey={FIXTURE.duaKey} />);
    expect(screen.getByText(FIXTURE.hadeeth)).toBeOnTheScreen();
    expect(screen.getByText('المعنى')).toBeOnTheScreen();
    expect(screen.getByText(FIXTURE.explanation)).toBeOnTheScreen();
    expect(screen.getByText('الفوائد')).toBeOnTheScreen();
  });

  it('shows no reference or grade section, even when the data has them', async () => {
    mocked.usePropheticDua.mockReturnValue(FIXTURE);
    await renderUi(<DuaHadithDetailScreen duaKey={FIXTURE.duaKey} />);
    expect(screen.queryByText('المرجع')).toBeNull();
    expect(screen.queryByText(FIXTURE.reference)).toBeNull();
    expect(screen.queryByText('الدرجة')).toBeNull();
    expect(screen.queryByText(FIXTURE.grade)).toBeNull();
  });

  it('shows each hint as its own paragraph within one section', async () => {
    mocked.usePropheticDua.mockReturnValue(FIXTURE);
    await renderUi(<DuaHadithDetailScreen duaKey={FIXTURE.duaKey} />);
    expect(screen.getByText(FIXTURE_HINTS.join('\n\n'))).toBeOnTheScreen();
  });

  it('shows no source text, no narrator line and no source link', async () => {
    mocked.usePropheticDua.mockReturnValue(FIXTURE);
    await renderUi(<DuaHadithDetailScreen duaKey={FIXTURE.duaKey} />);
    expect(screen.queryByText(SOURCE_TEXT)).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByTestId('dua-source-link')).toBeNull();
    expect(screen.queryByTestId('dua-hadith-body-attribution')).toBeNull();
  });

  it('hides a section whose field is empty', async () => {
    mocked.usePropheticDua.mockReturnValue({ ...FIXTURE, explanation: null, hints: [] });
    await renderUi(<DuaHadithDetailScreen duaKey={FIXTURE.duaKey} />);
    expect(screen.queryByText('المعنى')).toBeNull();
    expect(screen.queryByText('الفوائد')).toBeNull();
    expect(screen.getByText(FIXTURE.hadeeth)).toBeOnTheScreen();
  });

  it('shows the action row, and opens the text size control on its Aa button', async () => {
    mocked.usePropheticDua.mockReturnValue(FIXTURE);
    await renderUi(<DuaHadithDetailScreen duaKey={FIXTURE.duaKey} />);
    expect(screen.getByRole('button', { name: 'إضافة إلى المفضلة' })).toBeOnTheScreen();
    expect(screen.queryByTestId('azkar-text-size')).toBeNull();
    await press(screen.getByRole('button', { name: 'حجم النص' }));
    expect(screen.getByTestId('azkar-text-size')).toBeOnTheScreen();
  });

  // ADR 0092 decision 3: hadith duas stay text-only. No licensed recording exists, so no play control is drawn.
  it('draws no play control, no download and no player bar for a hadith dua', async () => {
    mocked.usePropheticDua.mockReturnValue(FIXTURE);
    await renderUi(<DuaHadithDetailScreen duaKey={FIXTURE.duaKey} />);
    expect(screen.queryByRole('button', { name: 'تشغيل التسجيل' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'إيقاف التسجيل مؤقتًا' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'تنزيل التسجيل' })).toBeNull();
    expect(screen.queryByTestId('azkar-player-bar')).toBeNull();
  });
});
