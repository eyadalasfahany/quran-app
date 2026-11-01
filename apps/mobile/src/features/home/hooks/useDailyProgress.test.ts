import { renderHook } from '@testing-library/react-native';

import { useAzkarAvailable, useSessionCategoryProgress } from '@/features/azkar/data';
import { useDailyGoals } from '@/features/daily-goals/hooks/useDailyGoals';
import { useSibhaTodayTotal } from '@/features/sibha/data/store';

import { useDailyProgress } from './useDailyProgress';
import { useHomeWird, type HomeWird } from './useHomeWird';

jest.mock('@/features/azkar/data', () => ({
  useAzkarAvailable: jest.fn(() => true),
  useSessionCategoryProgress: jest.fn(() => []),
}));

jest.mock('@/features/daily-goals/hooks/useDailyGoals', () => ({
  useDailyGoals: jest.fn(),
}));

jest.mock('@/features/sibha/data/store', () => ({
  useSibhaTodayTotal: jest.fn(() => 0),
}));

jest.mock('./useHomeWird', () => ({
  useHomeWird: jest.fn(() => null),
}));

const wird: HomeWird = {
  dayIndex: 10,
  durationDays: 30,
  pagesRead: 80,
  pagesToday: 4,
  pagesTotal: 604,
  todayTarget: 21,
};

const sessions = [
  { completed: 24, done: true, id: 'morning', title: 'أذكار الصباح', total: 24 },
  { completed: 5, done: false, id: 'evening', title: 'أذكار المساء', total: 24 },
];

function setGoals(goals: { wird: boolean; sessions: string[]; misbahaTarget: number | null }) {
  jest.mocked(useDailyGoals).mockReturnValue({ goals, update: jest.fn() });
}

describe('useDailyProgress', () => {
  beforeEach(() => {
    jest.mocked(useAzkarAvailable).mockReturnValue(true);
    jest.mocked(useSessionCategoryProgress).mockReturnValue(sessions as unknown as ReturnType<typeof useSessionCategoryProgress>);
    jest.mocked(useSibhaTodayTotal).mockReturnValue(50);
    jest.mocked(useHomeWird).mockReturnValue(wird);
    setGoals({ misbahaTarget: 100, sessions: ['morning', 'evening'], wird: true });
  });

  it('gives one labelled line per chosen goal, with its value', async () => {
    const { result } = await renderHook(() => useDailyProgress());

    expect(result.current.lines).toEqual([
      { done: false, key: 'wird', label: 'وردك اليومي', value: '٤ من ٢١ صفحة' },
      { done: true, key: 'session:morning', label: 'أذكار الصباح', value: 'مكتمل' },
      { done: false, key: 'session:evening', label: 'أذكار المساء', value: '٥ من ٢٤' },
      { done: false, key: 'misbaha', label: 'المسبحة', value: '٥٠ من ١٠٠' },
    ]);
    expect(result.current.percent).toBe(Math.round(((4 / 21 + 1 + 5 / 24 + 0.5) / 4) * 100));
  });

  it('is empty with nothing chosen, and quiet with no data for the chosen goals', async () => {
    setGoals({ misbahaTarget: null, sessions: [], wird: false });
    const none = await renderHook(() => useDailyProgress());
    expect(none.result.current).toEqual({ lines: [], percent: 0 });

    jest.mocked(useHomeWird).mockReturnValue(null);
    setGoals({ misbahaTarget: null, sessions: [], wird: true });
    const noPlan = await renderHook(() => useDailyProgress());
    expect(noPlan.result.current).toEqual({ lines: [], percent: 0 });
  });

  it('hides the Azkar sessions without Azkar content, and keeps the misbaha goal', async () => {
    jest.mocked(useAzkarAvailable).mockReturnValue(false);

    const { result } = await renderHook(() => useDailyProgress());

    expect(result.current.lines.map((line) => line.key)).toEqual(['wird', 'misbaha']);
  });
});
