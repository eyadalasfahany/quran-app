import { renderHook } from '@testing-library/react-native';

import { openContentDb, useContentDb } from '@/core/db/content/open';
import { planProgress, useActivePlan, usePlanLogs } from '@/features/khatma/data';
import { resolvePlanBounds } from '@/features/khatma/plan-bounds';

import { useHomeWird } from './useHomeWird';

jest.mock('@/core/db/content/open', () => ({
  openContentDb: jest.fn(),
  useContentDb: jest.fn(() => ({ error: null, ready: true })),
}));

jest.mock('@/features/khatma/data', () => ({
  ...jest.requireActual<typeof import('@/features/khatma/data')>('@/features/khatma/data'),
  useActivePlan: jest.fn(() => ({ data: [] })),
  usePlanLogs: jest.fn(() => ({ data: [] })),
}));

jest.mock('@/features/khatma/plan-bounds', () => ({
  resolvePlanBounds: jest.fn(),
}));

const plan = {
  durationDays: 30,
  id: 7,
  startDate: '2026-10-25',
  startVerseId: 1,
};

describe('useHomeWird', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(2026, 10, 1, 12, 0, 0) });
    jest.mocked(useContentDb).mockReturnValue({ error: null, ready: true });
    jest.mocked(useActivePlan).mockReturnValue({ data: [] } as unknown as ReturnType<typeof useActivePlan>);
    jest.mocked(usePlanLogs).mockReturnValue({ data: [] } as unknown as ReturnType<typeof usePlanLogs>);
    jest.mocked(openContentDb).mockReturnValue({ executor: {} } as ReturnType<typeof openContentDb>);
    jest.mocked(resolvePlanBounds).mockReturnValue({ pagesTotal: 604 } as unknown as ReturnType<typeof resolvePlanBounds>);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('is null without an active plan', async () => {
    const { result } = await renderHook(() => useHomeWird());

    expect(result.current).toBeNull();
  });

  it('is null while the content database is not open', async () => {
    jest.mocked(useActivePlan).mockReturnValue({ data: [plan] } as unknown as ReturnType<typeof useActivePlan>);
    jest.mocked(useContentDb).mockReturnValue({ error: null, ready: false });

    const { result } = await renderHook(() => useHomeWird());

    expect(result.current).toBeNull();
  });

  it('reads today’s pages from today’s log, and today’s target from the plan', async () => {
    jest.mocked(useActivePlan).mockReturnValue({ data: [plan] } as unknown as ReturnType<typeof useActivePlan>);
    jest.mocked(usePlanLogs).mockReturnValue({
      data: [
        { date: '2026-11-01', pagesRead: 4 },
        { date: '2026-10-31', pagesRead: 9 },
      ],
    } as unknown as ReturnType<typeof usePlanLogs>);

    const { result } = await renderHook(() => useHomeWird());

    const expected = planProgress(
      plan,
      [
        { date: '2026-11-01', pagesRead: 4 },
        { date: '2026-10-31', pagesRead: 9 },
      ],
      '2026-11-01',
      604,
    );
    expect(result.current).toMatchObject({
      durationDays: 30,
      pagesRead: 13,
      pagesToday: 4,
      pagesTotal: 604,
      todayTarget: expected.todayTarget,
    });
  });

  it('is null when the plan bounds cannot be resolved', async () => {
    jest.mocked(useActivePlan).mockReturnValue({ data: [plan] } as unknown as ReturnType<typeof useActivePlan>);
    jest.mocked(resolvePlanBounds).mockReturnValue(null);

    const { result } = await renderHook(() => useHomeWird());

    expect(result.current).toBeNull();
  });
});
