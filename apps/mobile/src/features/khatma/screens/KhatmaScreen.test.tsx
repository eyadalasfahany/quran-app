import { act, fireEvent } from '@testing-library/react-native';

import type { KhatmaPlan } from '@/features/khatma/data';

import { flatStyle, renderUi } from '../../../../jest/render-ui';
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
const mockEndPlan = jest.fn();

jest.mock('@/features/khatma/data', () => ({
  ...jest.requireActual<typeof import('@/features/khatma/data')>('@/features/khatma/data'),
  endPlan: (id: string, status: string) => mockEndPlan(id, status),
  useActivePlan: () => mockUseActivePlan(),
  useKhatmaMarkerVerseId: () => null,
  usePlanLogs: () => ({ data: [] }),
}));

// The confirmation fades in, so until its animation ends its elements count as hidden to the query.
const SHOWN = { includeHiddenElements: true } as const;

describe('KhatmaScreen saveMode', () => {
  beforeEach(() => {
    mockUseActivePlan.mockReturnValue({ data: [] });
    mockEndPlan.mockClear();
  });

  it('pads the scroll content by the footer height, so the last card clears the footer CTA', async () => {
    mockUseActivePlan.mockReturnValue({ data: [activePlan] });
    const view = await renderUi(<KhatmaScreen />);

    await act(async () => {
      fireEvent(view.getByTestId('khatma-footer'), 'layout', { nativeEvent: { layout: { height: 88, width: 390, x: 0, y: 0 } } });
    });

    expect(flatStyle(view.getByTestId('khatma-scroll').props.contentContainerStyle).paddingBottom).toBe(88);
  });

  it('asks before ending the plan in the shared dialog, and ends it only when confirmed', async () => {
    mockUseActivePlan.mockReturnValue({ data: [activePlan] });
    const view = await renderUi(<KhatmaScreen />);

    await fireEvent.press(view.getByTestId('khatma-end-plan'));

    expect(view.getByText('إنهاء الختمة؟', SHOWN)).toBeOnTheScreen();
    expect(view.getByTestId('khatma-end-dialog-icon-glyph', SHOWN).props.children.props.name).toEqual({
      ios: 'stop.circle',
      android: 'stop_circle',
    });
    expect(mockEndPlan).not.toHaveBeenCalled();

    await fireEvent.press(view.getByTestId('khatma-end-dialog-confirm', SHOWN));
    expect(mockEndPlan).toHaveBeenCalledWith('plan-1', 'abandoned');
  });

  it('keeps the plan when ending it is cancelled', async () => {
    mockUseActivePlan.mockReturnValue({ data: [activePlan] });
    const view = await renderUi(<KhatmaScreen />);

    await fireEvent.press(view.getByTestId('khatma-end-plan'));
    await fireEvent.press(view.getByTestId('khatma-end-dialog-cancel', SHOWN));

    expect(mockEndPlan).not.toHaveBeenCalled();
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

    await fireEvent.press(view.getByRole('tab', { name: '٧ يومًا' }));

    expect(await view.findByRole('button', { name: 'حفظ الخطة' })).toBeOnTheScreen();
    expect(view.queryByTestId('khatma-progress-grid')).toBeNull();
  });

  it('shows save plan when there is no active plan', async () => {
    const view = await renderUi(<KhatmaScreen />);

    expect(view.getByTestId('khatma-primary-cta')).toHaveTextContent('حفظ الخطة');
    expect(view.queryByTestId('khatma-progress-grid')).toBeNull();
  });
});

describe('KhatmaScreen layout (ADR 0036)', () => {
  it('keeps the plan in one column capped at 720, and the primary action inside it', async () => {
    const view = await renderUi(<KhatmaScreen />);

    expect(flatStyle(view.getByTestId('khatma-column').props.style)).toMatchObject({ maxWidth: 720, width: '100%' });
    expect(view.getByTestId('khatma-column')).toContainElement(view.getByTestId('khatma-primary-cta'));
  });
});
