import { fireEvent } from '@testing-library/react-native';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { renderUi } from '../../../../jest/render-ui';

import { RecitersStorageSection, type ReciterStorageItem } from './RecitersStorageSection';

const sample: ReciterStorageItem = {
  reciterResourceId: 7,
  name: 'مشاري راشد العفاسي',
  surahCount: 14,
  bytes: 12 * 1024 * 1024,
  isDownloading: false,
  downloadProgress: 0,
};

describe('RecitersStorageSection', () => {
  it('renders nothing when there are no rows', async () => {
    const view = await renderUi(
      <RecitersStorageSection onDownloadAll={jest.fn()} onStop={jest.fn()} rows={[]} />,
    );
    expect(view.queryByTestId('downloads-reciters-section')).toBeNull();
  });

  it('renders the section header and rows', async () => {
    const view = await renderUi(
      <RecitersStorageSection onDownloadAll={jest.fn()} onStop={jest.fn()} rows={[sample]} />,
    );
    expect(view.getByRole('header', { name: 'التلاوات' })).toBeOnTheScreen();
    expect(view.getByTestId('reciter-storage-row-7')).toBeOnTheScreen();
  });

  it('calls onDownloadAll with the reciter id', async () => {
    const onDownloadAll = jest.fn();
    const view = await renderUi(
      <RecitersStorageSection onDownloadAll={onDownloadAll} onStop={jest.fn()} rows={[sample]} />,
    );
    fireEvent.press(view.getByTestId('reciter-storage-row-7-download-all'));
    expect(onDownloadAll).toHaveBeenCalledWith(7);
  });

  it('calls onStop while downloading', async () => {
    const onStop = jest.fn();
    const view = await renderUi(
      <RecitersStorageSection
        onDownloadAll={jest.fn()}
        onStop={onStop}
        rows={[{ ...sample, isDownloading: true, downloadProgress: 0.4 }]}
      />,
    );
    fireEvent.press(view.getByTestId('reciter-storage-row-7-stop'));
    expect(onStop).toHaveBeenCalledWith(7);
  });

  it('renders under English', async () => {
    const view = await renderUi(
      <RecitersStorageSection onDownloadAll={jest.fn()} onStop={jest.fn()} rows={[sample]} />,
      { locale: 'en' },
    );
    expect(view.getByRole('header', { name: 'Recitations' })).toBeOnTheScreen();
  });

  it('uses no raw color literals', () => {
    expect(rawColorLiteralsInFeature('src/features/downloads/components/RecitersStorageSection.tsx')).toEqual([]);
  });
});
