import { fireEvent } from '@testing-library/react-native';

import type { KhatmaPlan } from '@/features/khatma/data';

import { renderUi } from '../../../../jest/render-ui';
import { KhatmaScreen } from './KhatmaScreen';

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
  };
});

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
}));

jest.mock('@/core/db/content/open', () => ({
  openContentDb: () => ({ executor: {} }),
  useContentDb: () => ({ error: null, ready: true }),
}));

jest.mock('@/features/reader/anchor/useLastReadVerseKey', () => ({
  useLastReadVerseKey: () => '2:80',
}));

jest.mock('@/features/reader/data/verses', () => ({
  getVerseByKey: (_db: unknown, key: string) =>
    key === '2:80'
      ? { chapterId: 2, id: 80, page: 20, verseKey: '2:80', verseNumber: 80 }
      : undefined,
  idToVerseKey: () => '2:50',
}));

jest.mock('@/features/reader/data/chapters', () => ({
  getChapter: () => ({ nameArabic: 'البقرة' }),
}));

jest.mock('@/features/khatma/plan-bounds', () => ({
  resolvePlanBounds: () => ({ pagesTotal: 555, startPage: 50 }),
}));

const activePlan: KhatmaPlan = {
  clientUpdatedAt: 1,
  completedAt: null,
  durationDays: 30,
  id: 'plan-1',
  startDate: '2026-01-01',
  startVerseId: 50,
  status: 'active',
};

const mockUseActivePlan = jest.fn(() => ({ data: [] as KhatmaPlan[] }));

jest.mock('@/features/khatma/data', () => ({
  ...jest.requireActual<typeof import('@/features/khatma/data')>('@/features/khatma/data'),
  useActivePlan: () => mockUseActivePlan(),
  useKhatmaMarkerVerseId: () => null,
  usePlanLogs: () => ({ data: [] }),
}));

describe('KhatmaScreen saveMode', () => {
  beforeEach(() => {
    mockUseActivePlan.mockReturnValue({ data: [] });
  });

  it('shows continue reading and progress when last-read moved past plan start', async () => {
    mockUseActivePlan.mockReturnValue({ data: [activePlan] });
    const view = await renderUi(<KhatmaScreen />);

    expect(view.getByTestId('khatma-progress-grid')).toBeOnTheScreen();
    expect(view.getByTestId('khatma-end-plan')).toBeOnTheScreen();
    expect(view.getByTestId('khatma-primary-cta')).toHaveTextContent('تابع القراءة');
  });

  it('switches to save plan after the user changes duration', async () => {
    mockUseActivePlan.mockReturnValue({ data: [activePlan] });
    const view = await renderUi(<KhatmaScreen />);

    fireEvent.press(view.getByRole('tab', { name: '٧ يومًا' }));

    expect(await view.findByRole('button', { name: 'حفظ الخطة' })).toBeOnTheScreen();
    expect(view.queryByTestId('khatma-progress-grid')).toBeNull();
  });

  it('shows save plan when there is no active plan', async () => {
    const view = await renderUi(<KhatmaScreen />);

    expect(view.getByTestId('khatma-primary-cta')).toHaveTextContent('حفظ الخطة');
    expect(view.queryByTestId('khatma-progress-grid')).toBeNull();
  });
});
