import { storage, storageKeys } from '@/core/storage/mmkv';

import { DISCOVER_ENTRIES } from './registry';
import {
  completeTourStep,
  endTour,
  finishDiscoverSet,
  getDiscoverSnapshot,
  getDiscoverVersion,
  hideDiscoverCard,
  lastTourFinished,
  markDiscovered,
  nextTourStep,
  readDiscoverState,
  skipTourStep,
  startTour,
  subscribeDiscover,
} from './store';

const ALL_IDS = DISCOVER_ENTRIES.map((entry) => entry.id);

beforeEach(() => {
  storage.clearAll();
});

describe('readDiscoverState', () => {
  it('starts empty: nothing done, nothing acknowledged, no tour', () => {
    expect(readDiscoverState()).toEqual({
      done: [],
      acknowledged: null,
      hidden: false,
      tourStep: null,
    });
  });

  it('drops stored values that are not registry ids', () => {
    storage.set(storageKeys.discover.done, JSON.stringify(['reader.mushaf', 'removed.row', 7]));
    storage.set(storageKeys.discover.tourStep, 'removed.row');
    const state = readDiscoverState();
    expect(state.done).toEqual(['reader.mushaf']);
    expect(state.tourStep).toBeNull();
  });

  it('treats corrupt JSON as empty', () => {
    storage.set(storageKeys.discover.done, '{not json');
    expect(readDiscoverState().done).toEqual([]);
  });
});

describe('markDiscovered', () => {
  it('records a row once, in the order it was done', () => {
    markDiscovered('reader.focus');
    markDiscovered('app.search');
    markDiscovered('reader.focus');
    expect(readDiscoverState().done).toEqual(['reader.focus', 'app.search']);
  });

  it('notifies subscribers, and not again for a row already done', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeDiscover(listener);
    const before = getDiscoverVersion();
    markDiscovered('my-quran');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getDiscoverVersion()).toBeGreaterThan(before);
    markDiscovered('my-quran');
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    markDiscovered('app.settings');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('finishDiscoverSet and hideDiscoverCard', () => {
  it('finishing acknowledges every current registry id', () => {
    finishDiscoverSet();
    expect(readDiscoverState().acknowledged).toEqual(ALL_IDS);
    expect(readDiscoverState().hidden).toBe(false);
  });

  it('hiding acknowledges every id and sets hidden', () => {
    hideDiscoverCard();
    const state = readDiscoverState();
    expect(state.acknowledged).toEqual(ALL_IDS);
    expect(state.hidden).toBe(true);
  });
});

describe('the guided tour', () => {
  it('starts at the row the person tapped', () => {
    startTour('worship.sibha');
    expect(readDiscoverState().tourStep).toBe('worship.sibha');
  });

  it('moves on when the current step is done by its action, marking it done', () => {
    startTour('listen.follow');
    markDiscovered('listen.follow');
    const state = readDiscoverState();
    expect(state.done).toContain('listen.follow');
    expect(state.tourStep).toBe('worship.salah');
  });

  it('moves on even when the step was already done before the tour', () => {
    markDiscovered('listen.follow');
    startTour('listen.follow');
    markDiscovered('listen.follow');
    expect(readDiscoverState().tourStep).toBe('worship.salah');
  });

  it('does not move on when another row is done', () => {
    startTour('listen.follow');
    markDiscovered('app.search');
    expect(readDiscoverState().tourStep).toBe('listen.follow');
  });

  it('«التالي» completes a show step and moves on', () => {
    startTour('reader.mushaf');
    completeTourStep();
    const state = readDiscoverState();
    expect(state.done).toEqual(['reader.mushaf']);
    expect(state.tourStep).toBe('reader.reading');
  });

  it('«تخطي» marks the step done as seen, and moves on', () => {
    startTour('reader.mushaf');
    skipTourStep();
    const state = readDiscoverState();
    expect(state.done).toEqual(['reader.mushaf']);
    expect(state.tourStep).toBe('reader.reading');
  });

  it('«تخطي» on worship.sibha marks it done and moves the tour to worship.goals', () => {
    startTour('worship.sibha');
    skipTourStep();
    const state = readDiscoverState();
    expect(state.done).toContain('worship.sibha');
    expect(state.tourStep).toBe('worship.goals');
  });

  it('skips steps already done on the way forward', () => {
    markDiscovered('reader.reading');
    markDiscovered('reader.focus');
    startTour('reader.mushaf');
    skipTourStep();
    expect(readDiscoverState().tourStep).toBe('reader.tafsir');
  });

  it('finishes after the last step, and remembers it finished', () => {
    startTour('app.widget');
    completeTourStep();
    expect(readDiscoverState().tourStep).toBeNull();
    expect(lastTourFinished()).toBe(true);
  });

  it('«إنهاء» stops the tour where it is, not as a finish', () => {
    startTour('worship.azkar');
    endTour();
    expect(readDiscoverState().tourStep).toBeNull();
    expect(readDiscoverState().done).toEqual([]);
    expect(lastTourFinished()).toBe(false);
  });

  it('finds the next step that is not done, in list order', () => {
    expect(nextTourStep('reader.tafsir', [])).toBe('my-quran');
    expect(nextTourStep('reader.tafsir', ['my-quran', 'listen.follow'])).toBe('worship.salah');
    expect(nextTourStep('app.widget', [])).toBeNull();
  });
});

describe('snapshot', () => {
  it('keeps the same snapshot until a stored value changes, whoever writes it', () => {
    const first = getDiscoverSnapshot();
    expect(getDiscoverSnapshot()).toBe(first);

    markDiscovered('app.settings');
    const second = getDiscoverSnapshot();
    expect(second).not.toBe(first);
    expect(second.done).toContain('app.settings');

    storage.clearAll();
    expect(getDiscoverSnapshot().done).toEqual([]);
  });
});
