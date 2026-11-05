import { SKIP_NOTICE_MS, resetSkipNoticeForTests, useSkipNoticeStore } from './skip-notice';

beforeEach(() => {
  jest.useFakeTimers();
  resetSkipNoticeForTests();
});

afterEach(() => {
  resetSkipNoticeForTests();
  jest.useRealTimers();
});

describe('useSkipNoticeStore', () => {
  it('shows a notice with an id, the reciter and the skipped surahs', () => {
    useSkipNoticeStore.getState().show({ reciterId: 30, chapterIds: [37] });

    const notice = useSkipNoticeStore.getState().notice;
    expect(notice).toEqual({ id: expect.any(Number), reciterId: 30, chapterIds: [37] });
  });

  it('gives each notice a new id', () => {
    useSkipNoticeStore.getState().show({ reciterId: 30, chapterIds: [37] });
    const first = useSkipNoticeStore.getState().notice?.id;

    useSkipNoticeStore.getState().show({ reciterId: 30, chapterIds: [37] });

    expect(useSkipNoticeStore.getState().notice?.id).not.toBe(first);
  });

  it('lasts 4 000 ms: it is still there at 3 999 ms and gone at 4 000 ms', () => {
    expect(SKIP_NOTICE_MS).toBe(4_000);
    useSkipNoticeStore.getState().show({ reciterId: 30, chapterIds: [37] });

    jest.advanceTimersByTime(3_999);
    expect(useSkipNoticeStore.getState().notice).not.toBeNull();

    jest.advanceTimersByTime(1);
    expect(useSkipNoticeStore.getState().notice).toBeNull();
  });

  it('a second show at 2 000 ms replaces the notice and restarts the timer', () => {
    useSkipNoticeStore.getState().show({ reciterId: 30, chapterIds: [37] });
    jest.advanceTimersByTime(2_000);
    useSkipNoticeStore.getState().show({ reciterId: 30, chapterIds: [38, 39] });

    // The first notice's timer would have cleared it at 4 000 ms; the second keeps it there.
    jest.advanceTimersByTime(2_000);
    expect(useSkipNoticeStore.getState().notice).toMatchObject({ chapterIds: [38, 39] });

    jest.advanceTimersByTime(2_000);
    expect(useSkipNoticeStore.getState().notice).toBeNull();
  });

  it('clear removes the notice at once and cancels its timer', () => {
    useSkipNoticeStore.getState().show({ reciterId: 30, chapterIds: [37] });

    useSkipNoticeStore.getState().clear();
    expect(useSkipNoticeStore.getState().notice).toBeNull();

    // A new notice shown later is not cleared by the old timer.
    useSkipNoticeStore.getState().show({ reciterId: 30, chapterIds: [40] });
    jest.advanceTimersByTime(3_000);
    expect(useSkipNoticeStore.getState().notice).toMatchObject({ chapterIds: [40] });
  });

  it('a reset drops the notice and its timer', () => {
    useSkipNoticeStore.getState().show({ reciterId: 30, chapterIds: [37] });

    resetSkipNoticeForTests();
    expect(useSkipNoticeStore.getState().notice).toBeNull();
    expect(jest.getTimerCount()).toBe(0);
  });
});
