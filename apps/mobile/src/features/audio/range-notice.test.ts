import { RANGE_NOTICE_MS, resetRangeNoticeForTests, useRangeNoticeStore } from './range-notice';

beforeEach(() => {
  jest.useFakeTimers();
  resetRangeNoticeForTests();
});

afterEach(() => {
  resetRangeNoticeForTests();
  jest.useRealTimers();
});

describe('range notice store', () => {
  it('shows a notice and clears it after the notice time', () => {
    useRangeNoticeStore.getState().show();
    expect(useRangeNoticeStore.getState().notice).not.toBeNull();

    jest.advanceTimersByTime(RANGE_NOTICE_MS);
    expect(useRangeNoticeStore.getState().notice).toBeNull();
  });

  it('gives each notice a newer id and restarts the timer', () => {
    useRangeNoticeStore.getState().show();
    const first = useRangeNoticeStore.getState().notice?.id ?? 0;
    jest.advanceTimersByTime(RANGE_NOTICE_MS - 1);

    useRangeNoticeStore.getState().show();
    jest.advanceTimersByTime(RANGE_NOTICE_MS - 1);

    expect(useRangeNoticeStore.getState().notice?.id).toBeGreaterThan(first);
    jest.advanceTimersByTime(1);
    expect(useRangeNoticeStore.getState().notice).toBeNull();
  });

  it('clears at once', () => {
    useRangeNoticeStore.getState().show();
    useRangeNoticeStore.getState().clear();

    expect(useRangeNoticeStore.getState().notice).toBeNull();
  });
});
