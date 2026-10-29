import { CHAPTER_COUNT, clampSeek, isChapterId, nextChapterId, previousChapterId, queueFrom, usePlayerStore } from './playerStore';

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
