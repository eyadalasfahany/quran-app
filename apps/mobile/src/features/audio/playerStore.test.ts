import { CHAPTER_COUNT, clampSeek, clampVolume, isChapterId, nextChapterId, previousChapterId, queueFrom, usePlayerStore } from './playerStore';

beforeEach(() => {
  usePlayerStore.getState().reset();
});

describe('pure helpers', () => {
  it('queues the surah and every one after it, ending at 114', () => {
    expect(queueFrom(112)).toEqual([112, 113, 114]);
    expect(queueFrom(114)).toEqual([114]);
  });

  it('gives the next surah, or null after 114', () => {
    expect(nextChapterId(1)).toBe(2);
    expect(nextChapterId(113)).toBe(114);
    expect(nextChapterId(CHAPTER_COUNT)).toBeNull();
  });

  it('clamps the previous surah to 1 to 114', () => {
    expect(previousChapterId(2)).toBe(1);
    expect(previousChapterId(1)).toBe(1);
    expect(previousChapterId(200)).toBe(114);
  });

  it('accepts only whole surah numbers from 1 to 114', () => {
    expect(isChapterId(1)).toBe(true);
    expect(isChapterId(114)).toBe(true);
    expect(isChapterId(0)).toBe(false);
    expect(isChapterId(115)).toBe(false);
    expect(isChapterId(1.5)).toBe(false);
    expect(isChapterId('1')).toBe(false);
  });

  it('clamps seeks at zero only, so a seek past the content row duration is kept', () => {
    expect(clampSeek(-5)).toBe(0);
    expect(clampSeek(Number.NaN)).toBe(0);
    expect(clampSeek(46490)).toBe(46490);
  });
});

describe('playerStore transitions', () => {
  it('begins a load with the queue, the placeholder duration and no error', () => {
    usePlayerStore.getState().beginLoad({ reciterId: 30, chapterId: 1, positionMs: 0, durationMs: 46000 });
    const state = usePlayerStore.getState();

    expect(state).toMatchObject({ reciterId: 30, chapterId: 1 });
    expect(state.queue).toEqual(queueFrom(1));
    expect(state.status).toBe('loading');
    expect(state.durationMs).toBe(46000);
    expect(state.error).toBeNull();
    expect(state.activeVerseId).toBeNull();
    expect(state.activeWord).toBeNull();
  });

  it('moves from loading to playing, and from playing to paused', () => {
    const store = usePlayerStore.getState();
    store.beginLoad({ reciterId: 30, chapterId: 1, positionMs: 0, durationMs: 0 });
    store.markPlaying();
    expect(usePlayerStore.getState().status).toBe('playing');
    store.markPaused();
    expect(usePlayerStore.getState().status).toBe('paused');
  });

  it('does not mark an idle player as paused', () => {
    usePlayerStore.getState().markPaused();
    expect(usePlayerStore.getState().status).toBe('idle');
  });

  it('records a failure with its reason code', () => {
    usePlayerStore.getState().markFailed('not-installed');
    expect(usePlayerStore.getState()).toMatchObject({ status: 'error', error: 'not-installed' });
  });

  it('stops at position zero', () => {
    usePlayerStore.getState().setPosition(5000);
    usePlayerStore.getState().markStopped();
    expect(usePlayerStore.getState()).toMatchObject({ status: 'idle', positionMs: 0 });
  });

  it('restores as paused with no error and no player duration yet', () => {
    usePlayerStore.getState().restore({ reciterId: 30, chapterId: 2, positionMs: 5000 });
    expect(usePlayerStore.getState()).toMatchObject({ status: 'paused', chapterId: 2, positionMs: 5000, durationMs: 0, error: null });
  });

  it('moves to another surah on a track change, keeping the status and resetting the position', () => {
    const store = usePlayerStore.getState();
    store.beginLoad({ reciterId: 30, chapterId: 1, positionMs: 4000, durationMs: 46000 });
    store.markPlaying();
    store.setPosition(40000);

    usePlayerStore.getState().moveTo({ chapterId: 2, durationMs: 7264000 });

    expect(usePlayerStore.getState()).toMatchObject({ status: 'playing', chapterId: 2, positionMs: 0, durationMs: 7264000, error: null });
  });
});

describe('volume and the active ayah in the store', () => {
  it('clamps volume to 0 to 1, and ignores a value that is not a number', () => {
    expect(clampVolume(2)).toBe(1);
    expect(clampVolume(-1)).toBe(0);
    expect(clampVolume(0.25)).toBe(0.25);

    usePlayerStore.getState().setVolume(3);
    expect(usePlayerStore.getState().volume).toBe(1);
    usePlayerStore.getState().setVolume(Number.NaN);
    expect(usePlayerStore.getState().volume).toBe(1);
    usePlayerStore.getState().setVolume(0.4);
    expect(usePlayerStore.getState().volume).toBe(0.4);
  });

  it('starts at full volume with nothing highlighted', () => {
    expect(usePlayerStore.getState()).toMatchObject({ volume: 1, activeVerseId: null, activeWord: null });
  });

  it('sets the highlight, and keeps the same state when nothing changed', () => {
    usePlayerStore.getState().setActive(4, 2);
    const before = usePlayerStore.getState();
    expect(before).toMatchObject({ activeVerseId: 4, activeWord: 2 });

    usePlayerStore.getState().setActive(4, 2);
    expect(usePlayerStore.getState()).toBe(before);
  });

  it('clears the highlight on stop, failure and restore', () => {
    const store = usePlayerStore.getState();
    store.setActive(3, 1);
    store.markStopped();
    expect(usePlayerStore.getState()).toMatchObject({ activeVerseId: null, activeWord: null });

    store.setActive(3, 1);
    store.markFailed('load-failed');
    expect(usePlayerStore.getState()).toMatchObject({ activeVerseId: null, activeWord: null });

    store.setActive(3, 1);
    store.restore({ reciterId: 30, chapterId: 1, positionMs: 0 });
    expect(usePlayerStore.getState()).toMatchObject({ activeVerseId: null, activeWord: null });
  });
});

describe('repeat', () => {
  const store = () => usePlayerStore.getState();

  it('sets the range with done at 0, for each offered count', () => {
    for (const count of [1, 3, 5, 10, Infinity]) {
      store().setRepeat({ fromVerseId: 2, toVerseId: 4, count });
      expect(store().repeat).toEqual({ fromVerseId: 2, toVerseId: 4, count, done: 0 });
    }
  });

  it('resets done when a new range is set', () => {
    store().setRepeat({ fromVerseId: 2, toVerseId: 4, count: 5 });
    store().advanceRepeat();
    store().advanceRepeat();

    store().setRepeat({ fromVerseId: 3, toVerseId: 3, count: 3 });

    expect(store().repeat).toEqual({ fromVerseId: 3, toVerseId: 3, count: 3, done: 0 });
  });

  it('keeps the previous repeat for a count the control does not offer, or a from after to', () => {
    store().setRepeat({ fromVerseId: 2, toVerseId: 4, count: 3 });

    store().setRepeat({ fromVerseId: 2, toVerseId: 4, count: 2 });
    expect(store().repeat).toEqual({ fromVerseId: 2, toVerseId: 4, count: 3, done: 0 });

    store().setRepeat({ fromVerseId: 5, toVerseId: 4, count: 3 });
    expect(store().repeat).toEqual({ fromVerseId: 2, toVerseId: 4, count: 3, done: 0 });
  });

  it('counts seeks back with advanceRepeat, and does nothing without a range', () => {
    store().advanceRepeat();
    expect(store().repeat).toBeNull();

    store().setRepeat({ fromVerseId: 2, toVerseId: 4, count: 10 });
    store().advanceRepeat();
    expect(store().repeat).toMatchObject({ done: 1 });
  });

  it('clears with clearRepeat', () => {
    store().setRepeat({ fromVerseId: 2, toVerseId: 4, count: 3 });

    store().clearRepeat();

    expect(store().repeat).toBeNull();
  });

  it('is cleared when the surah changes, the player stops, or a session is restored', () => {
    store().beginLoad({ reciterId: 30, chapterId: 1, positionMs: 0, durationMs: 0 });
    store().setRepeat({ fromVerseId: 2, toVerseId: 4, count: 3 });
    store().moveTo({ chapterId: 2, durationMs: 0 });
    expect(store().repeat).toBeNull();

    store().setRepeat({ fromVerseId: 2, toVerseId: 4, count: 3 });
    store().markStopped();
    expect(store().repeat).toBeNull();

    store().setRepeat({ fromVerseId: 2, toVerseId: 4, count: 3 });
    store().restore({ reciterId: 30, chapterId: 1, positionMs: 0 });
    expect(store().repeat).toBeNull();
  });

  it('is cleared by reset', () => {
    store().setRepeat({ fromVerseId: 2, toVerseId: 4, count: 3 });

    store().reset();

    expect(store().repeat).toBeNull();
  });
});
