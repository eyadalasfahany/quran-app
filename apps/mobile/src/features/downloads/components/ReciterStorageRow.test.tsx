import { fireEvent } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { ReciterStorageRow } from './ReciterStorageRow';

const baseProps = {
  name: 'FIXTURE reciter 1',
  surahCount: 3,
  bytes: 4 * 1024 * 1024,
  isDownloading: false,
  downloadProgress: 0,
  onDownloadAll: jest.fn(),
  onStop: jest.fn(),
  testID: 'reciter-row',
};

describe('ReciterStorageRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders idle row with surah count and size', async () => {
    const view = await renderUi(<ReciterStorageRow {...baseProps} />);
    expect(view.getByText('FIXTURE reciter 1')).toBeOnTheScreen();
    expect(view.getByText(/3 سورة/)).toBeOnTheScreen();
  });

  it('renders downloading state with progress bar', async () => {
    const view = await renderUi(
      <ReciterStorageRow {...baseProps} downloadProgress={0.5} isDownloading />,
    );
    expect(view.getByText('جارٍ التنزيل')).toBeOnTheScreen();
    expect(view.getByRole('progressbar')).toBeOnTheScreen();
  });

  it('calls onDownloadAll from the pill', async () => {
    const onDownloadAll = jest.fn();
    const view = await renderUi(<ReciterStorageRow {...baseProps} onDownloadAll={onDownloadAll} />);
    await fireEvent.press(view.getByRole('button', { name: /تنزيل كل سور/ }));
    expect(onDownloadAll).toHaveBeenCalledTimes(1);
  });

  it('calls onStop from the stop disc', async () => {
    const onStop = jest.fn();
    const view = await renderUi(
      <ReciterStorageRow {...baseProps} downloadProgress={0.25} isDownloading onStop={onStop} />,
    );
    await fireEvent.press(view.getByRole('button', { name: /إيقاف تنزيل/ }));
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('uses download-all and stop accessibility labels in English', async () => {
    const view = await renderUi(<ReciterStorageRow {...baseProps} />, { locale: 'en' });
    expect(view.getByRole('button', { name: 'Download all of FIXTURE reciter 1' })).toBeOnTheScreen();
  });

  it.each(['ar', 'en'] as const)('renders under %s', async (locale) => {
    const view = await renderUi(<ReciterStorageRow {...baseProps} />, { locale });
    expect(view.getByTestId('reciter-row')).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours in source', () => {
    expect(rawColorLiteralsInFeature('src/features/downloads/components/ReciterStorageRow.tsx')).toEqual([]);
  });
});
