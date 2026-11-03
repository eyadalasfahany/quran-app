import { render, waitFor } from '@testing-library/react-native';
import { AppState, Platform } from 'react-native';

import { intakeWatchMisbahaDeltas, subscribeWatchUserInfo } from '@/features/watch/apple-watch';

import { WidgetSnapshotSync } from './WidgetSnapshotSync';

const mockFlush = jest.fn(async () => undefined);
const mockSchedule = jest.fn();
const mockCancel = jest.fn();

jest.mock('../snapshot/sync', () => ({
  createWidgetSync: () => ({ cancel: mockCancel, flush: mockFlush, schedule: mockSchedule }),
}));
jest.mock('../snapshot/gather', () => ({ gatherWidgetSnapshot: jest.fn() }));
jest.mock('../snapshot/publish', () => ({ publishWidgetSnapshot: jest.fn() }));
jest.mock('../snapshot/store', () => ({ readWidgetSnapshotJson: jest.fn(() => undefined) }));
jest.mock('../android/update', () => ({ requestAndroidWidgetUpdates: jest.fn() }));
jest.mock('@/features/daily-goals/hooks/useDailyGoals', () => ({
  useDailyGoals: () => ({ goals: { misbahaTarget: null, sessions: [], wird: false } }),
}));
jest.mock('@/features/reader/anchor/useLastReadVerseKey', () => ({ useLastReadVerseKey: () => '1:1' }));
jest.mock('@/features/salah/hooks', () => ({ usePrayerLocation: () => ({ coords: null }) }));
jest.mock('@/features/khatma/data', () => ({
  useActivePlan: () => ({ data: [] }),
  usePlanLogs: () => ({ data: [] }),
}));
jest.mock('@/features/azkar/data', () => ({ useAzkarProgressSummaries: () => [] }));
jest.mock('@/core/sync/catalog-version', () => ({ useCatalogVersion: (selector: (s: { version: number }) => number) => selector({ version: 1 }) }));
jest.mock('@/core/i18n', () => ({ useLocale: () => 'ar' }));
jest.mock('@/features/watch/apple-watch', () => ({
  intakeWatchMisbahaDeltas: jest.fn(),
  pushWatchApplicationContext: jest.fn(),
  subscribeWatchUserInfo: jest.fn(() => () => undefined),
}));
jest.mock('../ios/merge-on-foreground', () => ({ mergeIosWidgetTapsOnForeground: jest.fn() }));

describe('WidgetSnapshotSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing', () => {
    expect(() => render(<WidgetSnapshotSync enabled />)).not.toThrow();
  });

  it('schedules a rebuild once the content is ready', async () => {
    render(<WidgetSnapshotSync enabled />);
    await waitFor(() => expect(mockSchedule).toHaveBeenCalled());
  });

  it('does not rebuild before the content is ready', () => {
    render(<WidgetSnapshotSync enabled={false} />);
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('flushes when the app goes to the background and reschedules on return', async () => {
    const listeners: ((state: string) => void)[] = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, listener: (state: string) => void) => {
      listeners.push(listener);
      return { remove: jest.fn() };
    }) as typeof AppState.addEventListener);
    render(<WidgetSnapshotSync enabled />);
    await waitFor(() => expect(listeners.length).toBeGreaterThan(0));
    listeners.forEach((listener) => listener('background'));
    expect(mockFlush).toHaveBeenCalledTimes(1);
    listeners.forEach((listener) => listener('active'));
    expect(mockSchedule).toHaveBeenCalledTimes(2);
  });

  it('passes an array of watch user-info deliveries to intake as separate deltas', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const subscribeMock = subscribeWatchUserInfo as jest.Mock;
    const intakeMock = intakeWatchMisbahaDeltas as jest.Mock;
    render(<WidgetSnapshotSync enabled />);
    await waitFor(() => expect(subscribeMock).toHaveBeenCalled());
    const onDelta = subscribeMock.mock.calls[subscribeMock.mock.calls.length - 1][0] as (payload: unknown) => void;
    const deltas = [
      { date: '2026-11-02', installId: 'w1', seq: 1, source: 'watch', taps: 2 },
      { date: '2026-11-02', installId: 'w1', seq: 2, source: 'watch', taps: 1 },
    ];
    onDelta(deltas);
    expect(intakeMock).toHaveBeenCalledWith(expect.any(Date), deltas);
  });

  it('wraps a single non-array watch payload before intake', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const subscribeMock = subscribeWatchUserInfo as jest.Mock;
    const intakeMock = intakeWatchMisbahaDeltas as jest.Mock;
    render(<WidgetSnapshotSync enabled />);
    await waitFor(() => expect(subscribeMock).toHaveBeenCalled());
    const onDelta = subscribeMock.mock.calls[subscribeMock.mock.calls.length - 1][0] as (payload: unknown) => void;
    const delta = { date: '2026-11-02', installId: 'w1', seq: 3, source: 'watch', taps: 1 };
    onDelta(delta);
    expect(intakeMock).toHaveBeenCalledWith(expect.any(Date), [delta]);
  });
});
