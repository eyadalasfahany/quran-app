import { act, fireEvent, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@/core/theme';

import { useSvgMushafPack, type SvgMushafPackState } from '@/core/mushaf-pack';

import { renderUi } from '../../../../jest/render-ui';

import { MushafSvgContainer } from './MushafSvgContainer';

// The list is a stand-in here; its own tests cover the drawing.
jest.mock('../MushafSvgList', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Text: NativeText } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    MushafSvgList: (props: { mushafKey: string; reader: unknown }) =>
      React.createElement(NativeText, { testID: 'list-stub' }, `list ${props.mushafKey}`),
  };
});

jest.mock('@/core/mushaf-pack', () => ({
  ...jest.requireActual<typeof import('@/core/mushaf-pack')>('@/core/mushaf-pack'),
  useSvgMushafPack: jest.fn(),
}));

const download = jest.fn(async () => ({ status: 'installed' as const }));
const cancel = jest.fn();

function pack(overrides: Partial<SvgMushafPackState> = {}): SvgMushafPackState {
  return {
    availableVersion: 1,
    cancel,
    download,
    error: null,
    hasWordBoxes: false,
    installedVersion: null,
    progress: 0,
    reader: null,
    remove: jest.fn(),
    sizeBytes: 63_000_000,
    status: 'absent',
    updateAvailable: false,
    ...overrides,
  };
}

function container(onReadNow = jest.fn()) {
  return (
    <MushafSvgContainer
      anchorVerseKey="1:1"
      mushafKey="hafs"
      onReadNow={onReadNow}
      onSelectVerseKey={jest.fn()}
      testID="mushaf"
    />
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('MushafSvgContainer', () => {
  it('starts the download once, on the first open with the pack absent', async () => {
    jest.mocked(useSvgMushafPack).mockReturnValue(pack({ status: 'absent' }));
    await renderUi(container());
    expect(download).toHaveBeenCalledTimes(1);
    expect(download).toHaveBeenCalledWith();
  });

  it('shows the list once the pack is installed', async () => {
    jest.mocked(useSvgMushafPack).mockReturnValue(pack({ reader: {} as never, status: 'installed' }));
    await renderUi(container());
    expect(screen.getByTestId('list-stub')).toBeTruthy();
    expect(download).not.toHaveBeenCalled();
  });

  it('shows the card while downloading, with its progress', async () => {
    jest.mocked(useSvgMushafPack).mockReturnValue(pack({ progress: 0.42, status: 'downloading' }));
    await renderUi(container());
    expect(screen.getByLabelText('تقدم التنزيل')).toBeTruthy();
    expect(screen.queryByTestId('list-stub')).toBeNull();
  });

  it('on Wi-Fi only the card offers the mobile-data download, and passes allowCellular', async () => {
    jest.mocked(useSvgMushafPack).mockReturnValue(pack({ status: 'waiting_wifi' }));
    await renderUi(container());
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'تنزيل بالبيانات' }));
    });
    expect(download).toHaveBeenCalledWith({ allowCellular: true });
  });

  it('a failed download shows the error and retries', async () => {
    jest.mocked(useSvgMushafPack).mockReturnValue(pack({ error: 'network', status: 'failed' }));
    await renderUi(container());
    expect(screen.getByText('تعذّر الاتصال. أعد المحاولة.')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'إعادة المحاولة' }));
    });
    expect(download).toHaveBeenCalledTimes(1);
  });

  it('the read-now action calls onReadNow and leaves the download alone', async () => {
    jest.mocked(useSvgMushafPack).mockReturnValue(pack({ progress: 0.1, status: 'downloading' }));
    const onReadNow = jest.fn();
    await renderUi(container(onReadNow));
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'القراءة الآن' }));
    });
    expect(onReadNow).toHaveBeenCalledTimes(1);
    expect(cancel).not.toHaveBeenCalled();
  });

  it('swaps the card for the list when the pack installs, without a new mount', async () => {
    jest.mocked(useSvgMushafPack).mockReturnValue(pack({ progress: 0.9, status: 'verifying' }));
    const view = await renderUi(container());
    expect(screen.queryByTestId('list-stub')).toBeNull();
    jest.mocked(useSvgMushafPack).mockReturnValue(pack({ reader: {} as never, status: 'installed' }));
    // Same tree (the theme provider is kept), so the container is not mounted again.
    await act(async () => view.rerender(<ThemeProvider name="light">{container()}</ThemeProvider>));
    expect(screen.getByTestId('list-stub')).toBeTruthy();
    expect(download).toHaveBeenCalledTimes(0);
  });
});
