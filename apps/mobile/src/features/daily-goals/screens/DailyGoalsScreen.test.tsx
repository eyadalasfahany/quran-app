import { router } from 'expo-router';
import { fireEvent } from '@testing-library/react-native';

import { storage, storageKeys } from '@/core/storage/mmkv';
import { useAzkarAvailable, useSessionCategoryProgress } from '@/features/azkar/data';
import { useActivePlan } from '@/features/khatma/data';

import { renderUi } from '../../../../jest/render-ui';
import { parseDailyGoals } from '../data/goals';
import { DailyGoalsScreen } from './DailyGoalsScreen';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), replace: jest.fn() },
}));

jest.mock('@/features/azkar/data', () => ({
  useAzkarAvailable: jest.fn(() => true),
  useSessionCategoryProgress: jest.fn(() => [
    { completed: 0, done: false, id: 'morning', title: 'أذكار الصباح', total: 24 },
    { completed: 0, done: false, id: 'evening', title: 'أذكار المساء', total: 24 },
  ]),
}));

jest.mock('@/features/khatma/data', () => ({
  useActivePlan: jest.fn(() => ({ data: [] })),
}));

const saved = () => parseDailyGoals(storage.getString(storageKeys.dailyGoals));

describe('DailyGoalsScreen', () => {
  beforeEach(() => {
    storage.remove(storageKeys.dailyGoals);
    jest.mocked(useAzkarAvailable).mockReturnValue(true);
    jest.mocked(useActivePlan).mockReturnValue({ data: [] } as unknown as ReturnType<typeof useActivePlan>);
    jest.mocked(router.back).mockClear();
  });

  it('shows the sheet with the Azkar sessions and the misbaha goal, and nothing on by default', async () => {
    const view = await renderUi(<DailyGoalsScreen />);

    expect(view.getByRole('header', { name: 'أهدافي اليومية' })).toBeOnTheScreen();
    expect(view.getByTestId('goal-session-morning')).toBeOnTheScreen();
    expect(view.getByTestId('goal-session-evening')).toBeOnTheScreen();
    expect(view.getByTestId('goal-misbaha')).toBeOnTheScreen();
    expect(view.queryByTestId('goal-wird')).toBeNull();
    expect(view.queryByTestId('misbaha-target-stepper')).toBeNull();
    expect(saved()).toEqual({ misbahaTarget: null, sessions: [], wird: false });
  });

  it('shows the wird only with an active plan, and saves it when switched on', async () => {
    jest.mocked(useActivePlan).mockReturnValue({ data: [{ id: 1 }] } as unknown as ReturnType<typeof useActivePlan>);
    const view = await renderUi(<DailyGoalsScreen />);

    expect(view.getByTestId('goal-wird')).toBeOnTheScreen();
    await fireEvent(view.getByTestId('goal-wird'), 'valueChange', true);

    expect(saved().wird).toBe(true);
  });

  it('saves a session when its switch is turned on, and forgets it when turned off', async () => {
    const view = await renderUi(<DailyGoalsScreen />);

    await fireEvent(view.getByTestId('goal-session-morning'), 'valueChange', true);
    expect(saved().sessions).toEqual(['morning']);

    await fireEvent(view.getByTestId('goal-session-morning'), 'valueChange', false);
    expect(saved().sessions).toEqual([]);
  });

  it('turns the misbaha goal on at 100, and steps it within its range', async () => {
    const view = await renderUi(<DailyGoalsScreen />);

    await fireEvent(view.getByTestId('goal-misbaha'), 'valueChange', true);
    expect(saved().misbahaTarget).toBe(100);
    expect(view.getByTestId('misbaha-target-stepper-value')).toHaveTextContent('١٠٠');

    await fireEvent.press(view.getByRole('button', { name: 'زيادة' }));
    expect(saved().misbahaTarget).toBe(101);

    await fireEvent.press(view.getByRole('button', { name: 'تقليل' }));
    await fireEvent.press(view.getByRole('button', { name: 'تقليل' }));
    expect(saved().misbahaTarget).toBe(99);
  });

  it('hides the Azkar sessions without Azkar content, and keeps the misbaha goal', async () => {
    jest.mocked(useAzkarAvailable).mockReturnValue(false);
    const view = await renderUi(<DailyGoalsScreen />);

    expect(view.queryByTestId('goal-session-morning')).toBeNull();
    expect(view.getByTestId('goal-misbaha')).toBeOnTheScreen();
  });

  it('closes from done', async () => {
    const view = await renderUi(<DailyGoalsScreen />);

    await fireEvent.press(view.getByRole('button', { name: 'تم' }));

    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('reads the session titles from the hook', async () => {
    const view = await renderUi(<DailyGoalsScreen />);

    expect(view.getByText('أذكار المساء')).toBeOnTheScreen();
    expect(useSessionCategoryProgress).toHaveBeenCalled();
  });
});
