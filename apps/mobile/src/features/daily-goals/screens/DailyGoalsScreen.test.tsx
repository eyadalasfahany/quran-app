import { router } from 'expo-router';
import { act, fireEvent } from '@testing-library/react-native';

import { storage, storageKeys } from '@/core/storage/mmkv';
import { useAzkarAvailable, useSessionCategoryProgress } from '@/features/azkar/data';
import { useActivePlan } from '@/features/khatma/data';

import { renderUi } from '../../../../jest/render-ui';
import { parseDailyGoals } from '../data/goals';
import { DailyGoalsScreen } from './DailyGoalsScreen';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), push: jest.fn(), replace: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});

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

// The reminder row reads the notification service, which is not under test here; its own tests cover it.
jest.mock('@/features/settings/components/DailyReminderRow', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return { DailyReminderRow: () => createElement(Text, { testID: 'daily-reminder-row' }, 'تذكير الورد') };
});

const saved = () => parseDailyGoals(storage.getString(storageKeys.dailyGoals));

describe('DailyGoalsScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    storage.remove(storageKeys.dailyGoals);
    jest.mocked(useAzkarAvailable).mockReturnValue(true);
    jest.mocked(useActivePlan).mockReturnValue({ data: [] } as unknown as ReturnType<typeof useActivePlan>);
    jest.mocked(router.back).mockClear();
    jest.mocked(router.push).mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('hosts the sheet in a SheetHost, a modal card over a dimmed screen', async () => {
    const view = await renderUi(<DailyGoalsScreen />);

    expect(view.getByTestId('daily-goals-sheet').props.accessibilityViewIsModal).toBe(true);
    expect(view.getByTestId('sheet-backdrop')).toBeOnTheScreen();
    expect(view.getByRole('header', { name: 'أهدافي اليومية' })).toBeOnTheScreen();
  });

  it('shows the Azkar sessions and the misbaha goal, and nothing on by default', async () => {
    const view = await renderUi(<DailyGoalsScreen />);

    expect(view.getByTestId('goal-session-morning')).toBeOnTheScreen();
    expect(view.getByTestId('goal-session-evening')).toBeOnTheScreen();
    expect(view.getByTestId('goal-misbaha')).toBeOnTheScreen();
    expect(view.queryByTestId('goal-wird')).toBeNull();
    expect(view.queryByTestId('misbaha-target-stepper')).toBeNull();
    expect(saved()).toEqual({ misbahaTarget: null, sessions: [], wird: false });
  });

  describe('the wird row', () => {
    it('is the toggle, and saves it when switched on, with an active plan', async () => {
      jest.mocked(useActivePlan).mockReturnValue({ data: [{ id: 1 }] } as unknown as ReturnType<typeof useActivePlan>);
      const view = await renderUi(<DailyGoalsScreen />);

      expect(view.getByTestId('goal-wird')).toBeOnTheScreen();
      expect(view.queryByTestId('goal-start-khatma')).toBeNull();
      await fireEvent(view.getByTestId('goal-wird'), 'valueChange', true);

      expect(saved().wird).toBe(true);
    });

    it('is a «ابدأ ختمة» row that opens the khatma, without a plan', async () => {
      const view = await renderUi(<DailyGoalsScreen />);

      expect(view.queryByTestId('goal-wird')).toBeNull();
      await fireEvent.press(view.getByRole('button', { name: 'ابدأ ختمة, وردك اليومي (الختمة)' }));

      expect(router.push).toHaveBeenCalledWith('/khatma');
    });
  });

  it('saves a session when its switch is turned on, and forgets it when turned off', async () => {
    const view = await renderUi(<DailyGoalsScreen />);

    await fireEvent(view.getByTestId('goal-session-morning'), 'valueChange', true);
    expect(saved().sessions).toEqual(['morning']);

    await fireEvent(view.getByTestId('goal-session-morning'), 'valueChange', false);
    expect(saved().sessions).toEqual([]);
  });

  it('opens each session’s reminder sheet from its bell', async () => {
    const view = await renderUi(<DailyGoalsScreen />);

    await fireEvent.press(view.getByRole('button', { name: 'تذكير أذكار الصباح' }));
    expect(router.push).toHaveBeenLastCalledWith('/azkar/reminders?category=morning');

    await fireEvent.press(view.getByRole('button', { name: 'تذكير أذكار المساء' }));
    expect(router.push).toHaveBeenLastCalledWith('/azkar/reminders?category=evening');
    expect(saved().sessions).toEqual([]);
  });

  it('hides the Azkar sessions and their bells without Azkar content, and keeps the misbaha goal', async () => {
    jest.mocked(useAzkarAvailable).mockReturnValue(false);
    const view = await renderUi(<DailyGoalsScreen />);

    expect(view.queryByTestId('goal-session-morning')).toBeNull();
    expect(view.queryByRole('button', { name: 'تذكير أذكار الصباح' })).toBeNull();
    expect(view.getByTestId('goal-misbaha')).toBeOnTheScreen();
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

  it('opens the misbaha screen from its row', async () => {
    const view = await renderUi(<DailyGoalsScreen />);

    await fireEvent.press(view.getByRole('button', { name: 'فتح المسبحة' }));

    expect(router.push).toHaveBeenCalledWith('/sibha');
  });

  it('shows the daily reading reminder row from Settings', async () => {
    const view = await renderUi(<DailyGoalsScreen />);

    expect(view.getByTestId('daily-reminder-row')).toBeOnTheScreen();
  });

  it('opens Salah from the prayer notifications row', async () => {
    const view = await renderUi(<DailyGoalsScreen />);

    await fireEvent.press(view.getByRole('button', { name: 'إشعارات الصلاة' }));

    expect(router.push).toHaveBeenCalledWith('/salah');
  });

  it('slides the sheet down from done, then leaves the route once', async () => {
    const view = await renderUi(<DailyGoalsScreen />);

    await fireEvent.press(view.getByRole('button', { name: 'تم' }));
    expect(router.back).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('reads the session titles from the hook', async () => {
    const view = await renderUi(<DailyGoalsScreen />);

    expect(view.getByText('أذكار المساء')).toBeOnTheScreen();
    expect(useSessionCategoryProgress).toHaveBeenCalled();
  });

  it('reads its labels in English', async () => {
    jest.mocked(useActivePlan).mockReturnValue({ data: [] } as unknown as ReturnType<typeof useActivePlan>);
    const view = await renderUi(<DailyGoalsScreen />, { locale: 'en' });

    expect(view.getByRole('header', { name: 'My daily goals' })).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'Start a khatma, Daily wird (khatma)' })).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'Open misbaha' })).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'Prayer notifications' })).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'Reminder أذكار الصباح' })).toBeOnTheScreen();
  });
});
