import { act } from '@testing-library/react-native';
import { router } from 'expo-router';

import { renderUi } from '../../../../jest/render-ui';
import { storage, storageKeys } from '@/core/storage/mmkv';
import { completeTourStep, endTour, readDiscoverState, skipTourStep, startTour, TOUR_ADVANCE_DELAY_MS } from '../store';

import { DiscoverTourNavigator } from './DiscoverTourNavigator';

jest.mock('expo-router', () => ({
  ...jest.requireActual<typeof import('expo-router')>('expo-router'),
  router: { push: jest.fn(), navigate: jest.fn(), back: jest.fn(), canDismiss: jest.fn(() => true), dismissAll: jest.fn() },
}));

beforeEach(() => {
  storage.clearAll();
  jest.clearAllMocks();
  jest.mocked(router.canDismiss).mockReturnValue(true);
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('DiscoverTourNavigator', () => {
  it('renders nothing and ends a tour left over from an earlier launch', async () => {
    storage.set(storageKeys.discover.tourStep, 'worship.sibha');
    const view = await renderUi(<DiscoverTourNavigator />);

    expect(view.toJSON()).toBeNull();
    expect(readDiscoverState().tourStep).toBeNull();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('opens the first step at once when the tour starts', async () => {
    await renderUi(<DiscoverTourNavigator />);
    await act(async () => {
      startTour('worship.sibha');
    });

    expect(router.push).toHaveBeenCalledWith('/sibha');
  });

  it('opens the next step after a pause when a step is done or skipped', async () => {
    await renderUi(<DiscoverTourNavigator />);
    await act(async () => {
      startTour('worship.sibha');
    });
    await act(async () => {
      skipTourStep();
    });
    expect(router.push).not.toHaveBeenCalledWith('/daily-goals');

    await act(async () => {
      jest.advanceTimersByTime(TOUR_ADVANCE_DELAY_MS);
    });
    expect(router.push).toHaveBeenCalledWith('/daily-goals');
  });

  it('returns to the Discover list when the tour runs out of steps', async () => {
    await renderUi(<DiscoverTourNavigator />);
    await act(async () => {
      startTour('app.widget');
    });
    await act(async () => {
      completeTourStep();
    });

    expect(router.navigate).toHaveBeenLastCalledWith('/discover');
  });

  it('closes the earlier steps’ screens before the next step opens', async () => {
    await renderUi(<DiscoverTourNavigator />);
    await act(async () => {
      startTour('worship.sibha');
    });
    await act(async () => {
      skipTourStep();
    });
    await act(async () => {
      jest.advanceTimersByTime(TOUR_ADVANCE_DELAY_MS);
    });

    expect(router.dismissAll).toHaveBeenCalledTimes(1);
    const nextPushIndex = jest.mocked(router.push).mock.calls.findIndex(([href]) => href === '/daily-goals');
    expect(nextPushIndex).toBeGreaterThan(0);
    expect(jest.mocked(router.dismissAll).mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(router.push).mock.invocationCallOrder[nextPushIndex] ?? Infinity,
    );
  });

  it('does not close any screens when the tour’s first step opens', async () => {
    await renderUi(<DiscoverTourNavigator />);
    await act(async () => {
      startTour('worship.sibha');
    });

    expect(router.push).toHaveBeenCalledWith('/sibha');
    expect(router.dismissAll).not.toHaveBeenCalled();
  });

  it('closes the screens, then returns to the Discover list, when the tour ends', async () => {
    await renderUi(<DiscoverTourNavigator />);
    await act(async () => {
      startTour('app.widget');
    });
    jest.mocked(router.dismissAll).mockClear();
    jest.mocked(router.navigate).mockClear();
    await act(async () => {
      completeTourStep();
    });

    expect(router.dismissAll).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith('/discover');
    expect(jest.mocked(router.dismissAll).mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(router.navigate).mock.invocationCallOrder[0] ?? Infinity,
    );
  });

  it('does not close screens when there is nothing to dismiss', async () => {
    jest.mocked(router.canDismiss).mockReturnValue(false);
    await renderUi(<DiscoverTourNavigator />);
    await act(async () => {
      startTour('worship.sibha');
    });
    await act(async () => {
      skipTourStep();
    });
    await act(async () => {
      jest.advanceTimersByTime(TOUR_ADVANCE_DELAY_MS);
    });

    expect(router.dismissAll).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith('/daily-goals');
  });

  it('stays where it is when the tour is ended with ✕', async () => {
    await renderUi(<DiscoverTourNavigator />);
    await act(async () => {
      startTour('worship.sibha');
    });
    jest.clearAllMocks();
    await act(async () => {
      endTour();
    });

    expect(router.navigate).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });
});
