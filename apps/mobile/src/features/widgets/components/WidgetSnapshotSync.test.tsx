import { render, waitFor } from '@testing-library/react-native';
import { AppState, Platform } from 'react-native';

import { readWidgetSnapshotJson } from '../snapshot/store';
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
  ...jest.requireActual('@/features/watch/apple-watch'),
  intakeWatchMisbahaDeltas: jest.fn(),
  pushWatchApplicationContext: jest.fn(),
  subscribeWatchUserInfo: jest.fn(() => () => undefined),
}));
const mockUpdateApplicationContext = jest.fn();
jest.mock('react-native-watch-connectivity', () => ({
  updateApplicationContext: (...args: unknown[]) => mockUpdateApplicationContext(...args),
  watchEvents: { addListener: () => () => undefined },
}));
jest.mock('../ios/merge-on-foreground', () => ({ mergeIosWidgetTapsOnForeground: jest.fn() }));

describe('WidgetSnapshotSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as { OS: string }).OS = 'ios';
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

  it('pushes the stored snapshot to the watch on mount even when no rebuild publishes', async () => {
    jest.mocked(readWidgetSnapshotJson).mockReturnValue('{"schemaVersion":1}');
    render(<WidgetSnapshotSync enabled />);
    await waitFor(() => expect(mockSchedule).toHaveBeenCalled());
    expect(mockUpdateApplicationContext).toHaveBeenCalledWith({ snapshot: '{"schemaVersion":1}' });
    jest.mocked(readWidgetSnapshotJson).mockReturnValue(undefined);
  });

  it('does not push to the watch while disabled', () => {
    jest.mocked(readWidgetSnapshotJson).mockReturnValue('{"schemaVersion":1}');
    render(<WidgetSnapshotSync enabled={false} />);
    expect(mockUpdateApplicationContext).not.toHaveBeenCalled();
    jest.mocked(readWidgetSnapshotJson).mockReturnValue(undefined);
  });

  it('pushes the stored snapshot again when the app becomes active', async () => {
    const listeners: ((state: string) => void)[] = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, listener: (state: string) => void) => {
      listeners.push(listener);
      return { remove: jest.fn() };
    }) as typeof AppState.addEventListener);
    jest.mocked(readWidgetSnapshotJson).mockReturnValue('{"schemaVersion":1}');
    render(<WidgetSnapshotSync enabled />);
    await waitFor(() => expect(mockUpdateApplicationContext).toHaveBeenCalledTimes(1));
    listeners.forEach((listener) => listener('active'));
    expect(mockUpdateApplicationContext).toHaveBeenCalledTimes(2);
    jest.mocked(readWidgetSnapshotJson).mockReturnValue(undefined);
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
});
