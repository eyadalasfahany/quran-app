import { fireEvent } from '@testing-library/react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { ListeningSection } from './ListeningSection';

jest.mock('@/features/audio/settings', () => ({
  useAudioSettings: jest.fn((selector: (s: { wifiOnlyDownloads: boolean }) => unknown) =>
    selector({ wifiOnlyDownloads: false }),
  ),
  setWifiOnlyDownloads: jest.fn(),
}));

describe('ListeningSection', () => {
  it('renders default reciter row, wifi toggle and downloads row', async () => {
    const view = await renderUi(<ListeningSection />);

    expect(view.getByTestId('listening-reciter-row')).toBeOnTheScreen();
    expect(view.getByTestId('listening-wifi-toggle-row')).toBeOnTheScreen();
    expect(view.getByTestId('listening-downloads-row')).toBeOnTheScreen();
  });

  it('shows the downloads trailing value when no navigation handler is provided', async () => {
    const view = await renderUi(<ListeningSection />);

    expect(view.getByText('إدارة التنزيلات')).toBeOnTheScreen();
  });

  it('shows downloadsTrailing when provided', async () => {
    const view = await renderUi(<ListeningSection downloadsTrailing="١٢٫٣ م.ب" />);

    expect(view.getByText('١٢٫٣ م.ب')).toBeOnTheScreen();
    expect(view.queryByText('إدارة التنزيلات')).toBeNull();
  });

  it('shows the provided reciterName in the reciter row', async () => {
    const view = await renderUi(<ListeningSection reciterName="مشاري العفاسي" />);

    expect(view.getByText('مشاري العفاسي')).toBeOnTheScreen();
  });

  it('calls onPressReciter when reciter row is pressed', async () => {
    const onPressReciter = jest.fn();
    const view = await renderUi(<ListeningSection onPressReciter={onPressReciter} />);

    fireEvent.press(view.getByTestId('listening-reciter-row'));

    expect(onPressReciter).toHaveBeenCalledTimes(1);
  });

  it('calls onWifiOnlyChange when the wifi toggle is pressed', async () => {
    const onWifiOnlyChange = jest.fn();
    const view = await renderUi(<ListeningSection onWifiOnlyChange={onWifiOnlyChange} wifiOnly={false} />);

    fireEvent(view.getByTestId('listening-wifi-toggle'), 'valueChange', true);

    expect(onWifiOnlyChange).toHaveBeenCalledWith(true);
  });

  it('reflects the controlled wifiOnly value on the toggle', async () => {
    const view = await renderUi(<ListeningSection wifiOnly={true} />);

    expect(view.getByTestId('listening-wifi-toggle').props.value).toBe(true);
  });

  it('calls onPressDownloads when downloads row is pressed', async () => {
    const onPressDownloads = jest.fn();
    const view = await renderUi(<ListeningSection onPressDownloads={onPressDownloads} />);

    fireEvent.press(view.getByTestId('listening-downloads-row'));

    expect(onPressDownloads).toHaveBeenCalledTimes(1);
  });

  it('has the correct section testID', async () => {
    const view = await renderUi(<ListeningSection testID="custom-listen" />);

    expect(view.getByTestId('custom-listen')).toBeOnTheScreen();
  });

  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderUi(<ListeningSection />, { locale });

    const expectedHeader = locale === 'en' ? 'Listening' : 'الاستماع';
    expect(view.getByRole('header', { name: expectedHeader })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/settings/components/ListeningSection.tsx')).toEqual([]);
  });
});
