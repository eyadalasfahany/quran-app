import { screen } from '@testing-library/react-native';

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
  links: [{ kind: 'hisn' as const, entryKey: 'fixture-entry' }],
};

const CREDIT_AR = 'المصدر: موسوعة الأحاديث النبوية (HadeethEnc.com) · ١';

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

  it('renders the text and the four sections, each with the source credit', async () => {
    mocked.usePropheticDua.mockReturnValue(FIXTURE);
    await renderUi(<DuaHadithDetailScreen duaKey={FIXTURE.duaKey} />);
    expect(screen.getByText(FIXTURE.hadeeth)).toBeOnTheScreen();
    expect(screen.getByText('المعنى')).toBeOnTheScreen();
    expect(screen.getByText(FIXTURE.explanation)).toBeOnTheScreen();
    expect(screen.getByText('المرجع')).toBeOnTheScreen();
    expect(screen.getByText(FIXTURE.reference)).toBeOnTheScreen();
    expect(screen.getByText('الدرجة')).toBeOnTheScreen();
    expect(screen.getByText(FIXTURE.grade)).toBeOnTheScreen();
    expect(screen.getByText('الفوائد')).toBeOnTheScreen();
    expect(screen.getAllByText(CREDIT_AR)).toHaveLength(4);
  });

  it('shows each hint as its own paragraph within one section', async () => {
    mocked.usePropheticDua.mockReturnValue(FIXTURE);
    await renderUi(<DuaHadithDetailScreen duaKey={FIXTURE.duaKey} />);
    expect(screen.getByText(FIXTURE_HINTS.join('\n\n'))).toBeOnTheScreen();
  });

  it('hides a section whose field is empty', async () => {
    mocked.usePropheticDua.mockReturnValue({ ...FIXTURE, grade: null, hints: [] });
    await renderUi(<DuaHadithDetailScreen duaKey={FIXTURE.duaKey} />);
    expect(screen.queryByText('الدرجة')).toBeNull();
    expect(screen.queryByText('الفوائد')).toBeNull();
    expect(screen.getByText('المعنى')).toBeOnTheScreen();
  });

  it('offers the source link, which is labelled as a link', async () => {
    mocked.usePropheticDua.mockReturnValue(FIXTURE);
    await renderUi(<DuaHadithDetailScreen duaKey={FIXTURE.duaKey} />);
    expect(screen.getByRole('link', { name: 'فتح على HadeethEnc.com' })).toBeOnTheScreen();
    expect(screen.queryByTestId('dua-link-card')).toBeNull();
    expect(screen.queryByTestId('duas-attribution-line')).toBeNull();
  });

  it('shows the action row, and opens the text size control on its Aa button', async () => {
    mocked.usePropheticDua.mockReturnValue(FIXTURE);
    await renderUi(<DuaHadithDetailScreen duaKey={FIXTURE.duaKey} />);
    expect(screen.getByRole('button', { name: 'إضافة إلى المفضلة' })).toBeOnTheScreen();
    expect(screen.queryByTestId('azkar-text-size')).toBeNull();
    await press(screen.getByRole('button', { name: 'حجم النص' }));
    expect(screen.getByTestId('azkar-text-size')).toBeOnTheScreen();
  });
});
