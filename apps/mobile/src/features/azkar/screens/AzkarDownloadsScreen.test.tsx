import { act, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { makeDownloadEntry, makeFakeDownloadPort, makeRecording } from '../../../../jest/azkar-audio-fixtures';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { renderUi } from '../../../../jest/render-ui';
import { AzkarDownloadsScreen } from './AzkarDownloadsScreen';

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) };
});

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), push: jest.fn(), replace: jest.fn() },
}));

// The confirmation fades in, so until its animation ends its elements count as hidden to the query.
const SHOWN = { includeHiddenElements: true } as const;
// The dialog's buttons by test ID: its confirm label is the same as the screen's «حذف الكل» button.
const REMOVE_CONFIRM = 'azkar-downloads-remove-dialog-confirm';
const REMOVE_CANCEL = 'azkar-downloads-remove-dialog-cancel';

const MB12 = 12 * 1024 * 1024;

function populatedPort() {
  return makeFakeDownloadPort([
    makeDownloadEntry({
      recording: makeRecording({ recordingKey: 'fixture:recording-001' }),
      recordingKey: 'fixture:recording-001',
      title: 'FIXTURE recording one',
      state: 'done',
      bytes: MB12,
    }),
    makeDownloadEntry({
      recording: makeRecording({ recordingKey: 'fixture:recording-002' }),
      recordingKey: 'fixture:recording-002',
      title: 'FIXTURE recording two',
      state: 'downloading',
      progress: 0.6,
      bytes: null,
    }),
    makeDownloadEntry({
      recording: makeRecording({ recordingKey: 'fixture:recording-003' }),
      recordingKey: 'fixture:recording-003',
      title: 'FIXTURE recording three',
      state: 'failed',
      progress: 0,
      bytes: null,
    }),
  ]);
}

describe('AzkarDownloadsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the empty state with no download buttons when the port reports nothing', async () => {
    await renderUi(<AzkarDownloadsScreen />);

    expect(screen.getByRole('header', { name: 'الصوتيات المحفوظة' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'لا تتوفر تسجيلات صوتية بعد' })).toBeOnTheScreen();
    expect(screen.getByText('ستظهر التسجيلات هنا بعد الحصول على ترخيص لنشرها.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'حذف الكل' })).toBeNull();
    // Only the header's back button remains.
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('lists the done, downloading and failed recordings with the storage used', async () => {
    await renderUi(<AzkarDownloadsScreen port={populatedPort()} />);

    expect(screen.queryByRole('header', { name: 'لا تتوفر تسجيلات صوتية بعد' })).toBeNull();
    expect(screen.getByText('المساحة المستخدمة')).toBeOnTheScreen();
    expect(screen.getByText('١٢ م.ب')).toBeOnTheScreen();
    expect(screen.getByText('١٢ م.ب · تم التنزيل')).toBeOnTheScreen();
    expect(screen.getByRole('progressbar', { name: 'FIXTURE recording two' })).toBeOnTheScreen();
    expect(screen.getByText('تعذّر التنزيل')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'إلغاء التنزيل FIXTURE recording two' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'إعادة المحاولة' })).toBeOnTheScreen();
  });

  it('asks before removing every recording, and removes them when confirmed', async () => {
    const port = populatedPort();
    await renderUi(<AzkarDownloadsScreen port={port} />);

    await press(screen.getByRole('button', { name: 'حذف الكل' }));
    expect(screen.getByText('حذف كل التسجيلات؟', SHOWN)).toBeOnTheScreen();
    expect(port.entries).toHaveLength(3);

    await act(async () => {
      await press(screen.getByTestId(REMOVE_CONFIRM, SHOWN));
    });
    expect(port.entries).toHaveLength(0);
    expect(screen.getByRole('header', { name: 'لا تتوفر تسجيلات صوتية بعد' })).toBeOnTheScreen();
    await waitFor(() => expect(screen.queryByText('حذف كل التسجيلات؟', SHOWN)).toBeNull());
  });

  it('keeps every recording when the removal is cancelled', async () => {
    const port = populatedPort();
    await renderUi(<AzkarDownloadsScreen port={port} />);

    await press(screen.getByRole('button', { name: 'حذف الكل' }));
    await press(screen.getByTestId(REMOVE_CANCEL, SHOWN));

    expect(port.entries).toHaveLength(3);
    expect(screen.getByText('١٢ م.ب')).toBeOnTheScreen();
    await waitFor(() => expect(screen.queryByText('حذف كل التسجيلات؟', SHOWN)).toBeNull());
  });

  it('cancels a downloading recording from its row', async () => {
    const port = populatedPort();
    await renderUi(<AzkarDownloadsScreen port={port} />);

    await press(screen.getByRole('button', { name: 'إلغاء التنزيل FIXTURE recording two' }));
    expect(port.entries.map((entry) => entry.recordingKey)).toEqual(['fixture:recording-001', 'fixture:recording-003']);
    expect(screen.queryByText('FIXTURE recording two')).toBeNull();
  });

  it('retries a failed recording from its row', async () => {
    const port = populatedPort();
    await renderUi(<AzkarDownloadsScreen port={port} />);

    await press(screen.getByRole('button', { name: 'إعادة المحاولة' }));
    expect(port.status('fixture:recording-003')?.state).toBe('downloading');
  });

  it('goes back through the router when there is history', async () => {
    await renderUi(<AzkarDownloadsScreen />);
    await press(screen.getByRole('button', { name: 'رجوع' }));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('replaces itself with Azkar home when opened with nothing under it', async () => {
    jest.mocked(router.canGoBack).mockReturnValueOnce(false);
    await renderUi(<AzkarDownloadsScreen />);
    await press(screen.getByRole('button', { name: 'رجوع' }));
    expect(router.replace).toHaveBeenCalledWith('/azkar');
  });

  it('shows the English empty state and populated list', async () => {
    await renderUi(<AzkarDownloadsScreen />, { locale: 'en' });
    expect(screen.getByRole('header', { name: 'No recordings are available yet' })).toBeOnTheScreen();
  });

  it('shows the English storage and actions for a populated list', async () => {
    await renderUi(<AzkarDownloadsScreen port={populatedPort()} />, { locale: 'en' });
    expect(screen.getByText('12 MB')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Delete all' })).toBeOnTheScreen();

    await press(screen.getByRole('button', { name: 'Delete all' }));
    expect(screen.getByText('Delete all recordings?', SHOWN)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Cancel', ...SHOWN })).toBeOnTheScreen();
    expect(screen.getByTestId(REMOVE_CONFIRM, SHOWN)).toHaveTextContent('Delete all');
  });
});
