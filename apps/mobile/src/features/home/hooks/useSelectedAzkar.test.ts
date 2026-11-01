import { renderHook } from '@testing-library/react-native';

import { useAzkarAvailable, useSessionCategoryProgress } from '@/features/azkar/data';

import { useSelectedAzkarItems } from './useSelectedAzkar';

jest.mock('@/features/azkar/data', () => ({
  useAzkarAvailable: jest.fn(() => true),
  useSessionCategoryProgress: jest.fn(() => []),
}));

const sessions = [
  { completed: 12, done: false, id: 'morning', title: 'أذكار الصباح', total: 24 },
  { completed: 24, done: true, id: 'evening', title: 'أذكار المساء', total: 24 },
  { completed: 0, done: false, id: 'sleep', title: 'أذكار النوم', total: 0 },
];

describe('useSelectedAzkarItems', () => {
  beforeEach(() => {
    jest.mocked(useAzkarAvailable).mockReturnValue(true);
    jest.mocked(useSessionCategoryProgress).mockReturnValue(sessions as unknown as ReturnType<typeof useSessionCategoryProgress>);
  });

  it('gives each session its share of today and its count, or «مكتمل» when done', async () => {
    const { result } = await renderHook(() => useSelectedAzkarItems());

    expect(result.current).toEqual([
      { fraction: 0.5, id: 'morning', progressText: '١٢ من ٢٤', title: 'أذكار الصباح' },
      { fraction: 1, id: 'evening', progressText: 'مكتمل', title: 'أذكار المساء' },
      { fraction: 0, id: 'sleep', progressText: '٠ من ٠', title: 'أذكار النوم' },
    ]);
  });

  it('is empty without Azkar content', async () => {
    jest.mocked(useAzkarAvailable).mockReturnValue(false);

    const { result } = await renderHook(() => useSelectedAzkarItems());

    expect(result.current).toEqual([]);
  });
});
