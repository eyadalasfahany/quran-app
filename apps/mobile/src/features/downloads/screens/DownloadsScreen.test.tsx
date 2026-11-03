import { fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { renderUi } from '../../../../jest/render-ui';
import { DownloadsScreen } from './DownloadsScreen';

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
  };
});

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), replace: jest.fn() },
}));

jest.mock('@/core/db/content/open', () => ({
  useContentDb: () => ({ ready: true }),
}));

jest.mock('@/core/db/user/open', () => ({
  openUserDb: () => ({
    db: {
      select: () => ({
        from: () => ({
          where: () => ({
            groupBy: () => ({}),
          }),
        }),
      }),
    },
  }),
}));

jest.mock('drizzle-orm/expo-sqlite', () => ({
  useLiveQuery: jest.fn(() => ({ data: [] })),
}));

jest.mock('@/features/downloads/hooks/useAudioStorageSummary', () => ({
  useAudioStorageSummary: jest.fn(() => ({ perReciter: [], totalBytes: 0 })),
}));

jest.mock('@/features/downloads/hooks/useFontStorageBytes', () => ({
  useFontStorageBytes: () => ({ bytes: 0, loading: false }),
}));

jest.mock('@/features/downloads/hooks/useTafsirStorageSummary', () => ({
  useTafsirStorageSummary: jest.fn(() => ({ perTafsir: [], totalBytes: 0 })),
}));

jest.mock('@/features/audio/hooks/useReciterCatalogue', () => ({
  useReciterCatalogue: () => ({
    reciters: [{ resourceId: 5, name: 'Mishari', nameAr: 'مشاري' }],
  }),
}));

jest.mock('@/features/audio/downloads/manager', () => ({
  enqueueAll: jest.fn(),
  cancelReciter: jest.fn(),
}));

const { useAudioStorageSummary } = jest.requireMock('@/features/downloads/hooks/useAudioStorageSummary') as {
  useAudioStorageSummary: jest.Mock;
};

const { useLiveQuery } = jest.requireMock('drizzle-orm/expo-sqlite') as {
  useLiveQuery: jest.Mock;
};

const { useTafsirStorageSummary } = jest.requireMock('@/features/downloads/hooks/useTafsirStorageSummary') as {
  useTafsirStorageSummary: jest.Mock;
};

const { enqueueAll, cancelReciter } = jest.requireMock('@/features/audio/downloads/manager') as {
  enqueueAll: jest.Mock;
  cancelReciter: jest.Mock;
};

describe('DownloadsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAudioStorageSummary.mockReturnValue({ perReciter: [], totalBytes: 0 });
    useLiveQuery.mockReturnValue({ data: [] });
    useTafsirStorageSummary.mockReturnValue({ perTafsir: [], totalBytes: 0 });
  });

  it('renders with no downloads', async () => {
    const view = await renderUi(<DownloadsScreen />);
    expect(view.getByTestId('downloads-storage-card')).toBeOnTheScreen();
    expect(view.queryByTestId('downloads-reciters-section')).toBeNull();
    expect(view.getByTestId('downloads-mushaf-section')).toBeOnTheScreen();
  });

  it('renders reciter rows from audio summary', async () => {
    useAudioStorageSummary.mockReturnValue({
      perReciter: [{ reciterResourceId: 5, surahCount: 2, bytes: 1024 }],
      totalBytes: 1024,
    });
    const view = await renderUi(<DownloadsScreen />);
    expect(view.getByTestId('reciter-storage-row-5')).toBeOnTheScreen();
  });

  it('shows an in-progress-only reciter with no done downloads', async () => {
    useLiveQuery.mockReturnValue({
      data: [{ reciterResourceId: 5, progress: 0.4 }],
    });
    const view = await renderUi(<DownloadsScreen />);
    expect(view.getByTestId('reciter-storage-row-5')).toBeOnTheScreen();
    expect(view.getByTestId('reciter-storage-row-5-stop')).toBeOnTheScreen();
  });

  it('calls enqueueAll from an idle reciter row', async () => {
    useAudioStorageSummary.mockReturnValue({
      perReciter: [{ reciterResourceId: 5, surahCount: 2, bytes: 1024 }],
      totalBytes: 1024,
    });
    const view = await renderUi(<DownloadsScreen />);
    fireEvent.press(view.getByTestId('reciter-storage-row-5-download-all'));
    expect(enqueueAll).toHaveBeenCalledWith(5);
  });

  it('calls cancelReciter from a downloading reciter row', async () => {
    useLiveQuery.mockReturnValue({
      data: [{ reciterResourceId: 5, progress: 0.5 }],
    });
    const view = await renderUi(<DownloadsScreen />);
    fireEvent.press(view.getByTestId('reciter-storage-row-5-stop'));
    expect(cancelReciter).toHaveBeenCalledWith(5);
  });

  it('renders tafsir rows inside mushaf section', async () => {
    useTafsirStorageSummary.mockReturnValue({
      perTafsir: [{ resourceId: 3, nameAr: 'FIXTURE tafsir', packSizeBytes: 2048 }],
      totalBytes: 2048,
    });
    const view = await renderUi(<DownloadsScreen />);
    expect(view.getByTestId('downloads-mushaf-section-tafsir-3')).toBeOnTheScreen();
  });

  it('shows footer note', async () => {
    const view = await renderUi(<DownloadsScreen />);
    expect(view.getByTestId('downloads-footer-note')).toBeOnTheScreen();
  });

  it('calls router.back from back button when history exists', async () => {
    const view = await renderUi(<DownloadsScreen />);
    fireEvent.press(view.getByTestId('downloads-back'));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('matches RTL render tree', async () => {
    const view = await renderUi(<DownloadsScreen />);
    expect(view.toJSON()).toMatchSnapshot();
  });
});
