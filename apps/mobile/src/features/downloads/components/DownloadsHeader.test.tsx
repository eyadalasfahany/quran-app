import { fireEvent } from '@testing-library/react-native';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { renderUi } from '../../../../jest/render-ui';

import { DownloadsHeader } from './DownloadsHeader';

describe('DownloadsHeader', () => {
  it('renders the title', async () => {
    const view = await renderUi(<DownloadsHeader onBack={jest.fn()} title="التنزيلات والمساحة" />);
    expect(view.getByRole('header', { name: 'التنزيلات والمساحة' })).toBeOnTheScreen();
  });

  it('calls onBack when the back button is pressed', async () => {
    const onBack = jest.fn();
    const view = await renderUi(<DownloadsHeader onBack={onBack} title="Downloads" />, { locale: 'en' });
    fireEvent.press(view.getByTestId('downloads-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders under English', async () => {
    const view = await renderUi(<DownloadsHeader onBack={jest.fn()} title="Downloads & storage" />, {
      locale: 'en',
    });
    expect(view.getByRole('header', { name: 'Downloads & storage' })).toBeOnTheScreen();
  });

  it('uses no raw color literals', () => {
    expect(rawColorLiteralsInFeature('src/features/downloads/components/DownloadsHeader.tsx')).toEqual([]);
  });
});
