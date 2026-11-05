import { act, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { setUpTests, useReducedMotion } from 'react-native-reanimated';

import { storage, storageKeys } from '@/core/storage/mmkv';
import { useAzkarAvailable } from '@/features/azkar/data';

import { renderUi } from '../../../../jest/render-ui';
import { applyRecommendedSet, isRecommendedSetDue } from '../data/recommended';
import { RecommendedRemindersScreen } from './RecommendedRemindersScreen';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), push: jest.fn(), replace: jest.fn() },
  useIsFocused: () => true,
}));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return { ...actual, __esModule: true, default: actual.default, useReducedMotion: jest.fn(() => false) };
});

// The user database is not open under Jest; no reminder is on, so the set is due.
jest.mock('@/features/azkar/reminders/reminders-repository', () => ({ listReminders: jest.fn(() => []) }));

jest.mock('@/features/azkar/data', () => ({
  useAzkarAvailable: jest.fn(() => true),
}));

// The set's own data (permission, bells, schedules) is not under test here; its own tests cover it.
jest.mock('../data/recommended', () => ({
  ...jest.requireActual('../data/recommended'),
  applyRecommendedSet: jest.fn(),
}));

setUpTests();

const CLOSE = 'recommended-reminders-header-close';
const CHOOSE = 'recommended-content-choose';
const ACCEPT = 'recommended-content-accept';
const CARD = 'recommended-reminders-sheet';
const BACKDROP = 'sheet-backdrop';

/** Runs the card's close animation to its end, then lets the completion leave the route. */
async function settle() {
  await act(async () => {
    jest.advanceTimersByTime(3000);
  });
}

type TreeNode = { props: { testID?: unknown }; children?: (TreeNode | string | null)[] | null };

/** The test IDs in paint order (a later sibling draws over an earlier one). */
function paintOrder(root: TreeNode): string[] {
  const ids: string[] = [];
  const visit = (node: TreeNode) => {
    if (typeof node.props.testID === 'string') {
      ids.push(node.props.testID);
    }
    (node.children ?? []).forEach((child) => {
      if (child && typeof child !== 'string') {
        visit(child);
      }
    });
  };
  visit(root);
  return ids;
}

describe('RecommendedRemindersScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    storage.clearAll();
    jest.mocked(router.back).mockClear();
    jest.mocked(router.push).mockClear();
    jest.mocked(applyRecommendedSet).mockReset();
    jest.mocked(useAzkarAvailable).mockReturnValue(true);
    jest.mocked(useReducedMotion).mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('closes the sheet when the X button is pressed', async () => {
    const view = await renderUi(<RecommendedRemindersScreen />);

    await fireEvent.press(view.getByTestId(CLOSE));
    await settle();

    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('closes the sheet when «اختيار بنفسي» is pressed, and marks the offer handled so it does not open again', async () => {
    const view = await renderUi(<RecommendedRemindersScreen />);
    expect(isRecommendedSetDue()).toBe(true);

    await fireEvent.press(view.getByTestId(CHOOSE));
    await settle();

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(storage.getBoolean(storageKeys.reminders.recommendedShown)).toBe(true);
    expect(isRecommendedSetDue()).toBe(false);
    expect(applyRecommendedSet).not.toHaveBeenCalled();
  });

  it('turns the set on and closes the sheet when «فعّل التذكيرات المقترحة» is pressed', async () => {
    jest.mocked(applyRecommendedSet).mockResolvedValue(true);
    const view = await renderUi(<RecommendedRemindersScreen />);

    await act(async () => {
      fireEvent.press(view.getByTestId(ACCEPT));
    });
    await settle();

    expect(applyRecommendedSet).toHaveBeenCalledWith({ hasAzkar: true });
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('keeps the sheet open and shows the permission notice when the permission is refused', async () => {
    jest.mocked(applyRecommendedSet).mockResolvedValue(false);
    const view = await renderUi(<RecommendedRemindersScreen />);

    await act(async () => {
      fireEvent.press(view.getByTestId(ACCEPT));
    });
    await settle();

    expect(router.back).not.toHaveBeenCalled();
    expect(view.getByTestId(CARD)).toBeOnTheScreen();
  });

  it('draws the sheet card over the dismiss backdrop, so the backdrop never covers its buttons', async () => {
    const view = await renderUi(<RecommendedRemindersScreen />);
    const order = paintOrder(view.toJSON() as TreeNode);

    expect(order.indexOf(BACKDROP)).toBeGreaterThanOrEqual(0);
    expect(order.indexOf(CARD)).toBeGreaterThan(order.indexOf(BACKDROP));
    expect(order.indexOf(CHOOSE)).toBeGreaterThan(order.indexOf(BACKDROP));
    expect(order.indexOf(CLOSE)).toBeGreaterThan(order.indexOf(BACKDROP));
  });
});
