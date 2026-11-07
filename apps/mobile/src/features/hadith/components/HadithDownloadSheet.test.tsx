import { fireEvent, screen } from '@testing-library/react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';

import type { CollectionDownloadState } from './CollectionDownloadButton';
import { HadithDownloadSheet } from './HadithDownloadSheet';

const TEST_ID = 'hadith-download-sheet';
const TITLE = '[اسم المجموعة]';

type Callbacks = {
  onWifiOnlyChange: jest.Mock;
  onDownload: jest.Mock;
  onCancel: jest.Mock;
  onRetry: jest.Mock;
  onClose: jest.Mock;
};

async function renderSheet(
  state: CollectionDownloadState,
  over: { wifiOnly?: boolean; waitingForWifi?: boolean; sizeBytes?: number } = {},
  locale: 'ar' | 'en' = 'ar',
): Promise<Callbacks> {
  const callbacks: Callbacks = {
    onWifiOnlyChange: jest.fn(),
    onDownload: jest.fn(),
    onCancel: jest.fn(),
    onRetry: jest.fn(),
    onClose: jest.fn(),
  };
  await renderUi(
    <HadithDownloadSheet
      coverTitle={TITLE}
      onCancel={callbacks.onCancel}
      onClose={callbacks.onClose}
      onDownload={callbacks.onDownload}
      onRetry={callbacks.onRetry}
      onWifiOnlyChange={callbacks.onWifiOnlyChange}
      sizeBytes={over.sizeBytes ?? 10276044}
      slug="bukhari"
      state={state}
      title={TITLE}
      wifiOnly={over.wifiOnly ?? true}
      waitingForWifi={over.waitingForWifi ?? false}
    />,
    { locale },
  );
  return callbacks;
}

describe('HadithDownloadSheet', () => {
  it('shows the title, the cover, the size and the Wi-Fi toggle', async () => {
    await renderSheet({ kind: 'available', sizeBytes: 10276044, offline: false });
    expect(screen.getByTestId(`${TEST_ID}-title`)).toHaveTextContent(TITLE);
    expect(screen.getByTestId(`${TEST_ID}-cover`)).toBeOnTheScreen();
    expect(screen.getByTestId(`${TEST_ID}-size`)).toHaveTextContent('٩٫٨ م.ب');
    expect(screen.getByRole('switch', { name: 'على شبكة Wi-Fi فقط' })).toBeOnTheScreen();
  });

  it('available shows the download button and calls onDownload', async () => {
    const callbacks = await renderSheet({ kind: 'available', sizeBytes: 1, offline: false });
    await press(screen.getByRole('button', { name: 'تنزيل' }));
    expect(callbacks.onDownload).toHaveBeenCalledTimes(1);
  });

  it('available while offline disables the download button', async () => {
    await renderSheet({ kind: 'available', sizeBytes: 1, offline: true });
    expect(screen.getByRole('button', { name: 'تنزيل' })).toBeDisabled();
  });

  it('downloading shows the progress block and calls onCancel', async () => {
    const callbacks = await renderSheet({ kind: 'downloading', progress: 0.6 });
    expect(screen.getByRole('progressbar')).toHaveProp('accessibilityValue', { min: 0, max: 100, now: 60 });
    await press(screen.getByRole('button', { name: 'إلغاء' }));
    expect(callbacks.onCancel).toHaveBeenCalledTimes(1);
  });

  it('failed shows the failed text and a retry button', async () => {
    const callbacks = await renderSheet({ kind: 'failed' });
    expect(screen.getByText('تعذّر التنزيل')).toBeOnTheScreen();
    await press(screen.getByRole('button', { name: 'إعادة المحاولة' }));
    expect(callbacks.onRetry).toHaveBeenCalledTimes(1);
  });

  it('installed shows no action button', async () => {
    await renderSheet({ kind: 'installed' });
    expect(screen.queryByRole('button', { name: 'تنزيل' })).toBeNull();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.queryByRole('button', { name: 'إعادة المحاولة' })).toBeNull();
  });

  it.each([
    ['available', { kind: 'available', sizeBytes: 1, offline: false }],
    ['downloading', { kind: 'downloading', progress: 0.2 }],
    ['failed', { kind: 'failed' }],
    ['installed', { kind: 'installed' }],
  ] as const)('shows the offline note in every state (%s)', async (_name, state) => {
    await renderSheet(state as CollectionDownloadState);
    expect(screen.getByText('تعمل المجموعة بعد التنزيل دون إنترنت.')).toBeOnTheScreen();
  });

  it('shows the wait-for-Wi-Fi line only when waitingForWifi', async () => {
    await renderSheet({ kind: 'failed' }, { waitingForWifi: false });
    expect(screen.queryByText('يبدأ التنزيل عند الاتصال بشبكة Wi-Fi.')).toBeNull();
  });

  it('shows the wait-for-Wi-Fi line when waitingForWifi is set', async () => {
    await renderSheet({ kind: 'failed' }, { waitingForWifi: true });
    expect(screen.getByText('يبدأ التنزيل عند الاتصال بشبكة Wi-Fi.')).toBeOnTheScreen();
  });

  it('the Wi-Fi toggle reports its change', async () => {
    const callbacks = await renderSheet({ kind: 'available', sizeBytes: 1, offline: false }, { wifiOnly: true });
    fireEvent(screen.getByRole('switch', { name: 'على شبكة Wi-Fi فقط' }), 'valueChange', false);
    expect(callbacks.onWifiOnlyChange).toHaveBeenCalledWith(false);
  });

  it('the close button calls onClose', async () => {
    const callbacks = await renderSheet({ kind: 'available', sizeBytes: 1, offline: false });
    await press(screen.getByRole('button', { name: 'إغلاق' }));
    expect(callbacks.onClose).toHaveBeenCalledTimes(1);
  });

  it('formats the size with Arabic digits in Arabic', async () => {
    await renderSheet({ kind: 'available', sizeBytes: 10276044, offline: false });
    expect(screen.getByTestId(`${TEST_ID}-size`)).toHaveTextContent('٩٫٨ م.ب');
  });

  it.each(locales)('renders in Arabic and English (%s)', async (locale) => {
    await renderSheet({ kind: 'available', sizeBytes: 10276044, offline: false }, {}, locale);
    expect(screen.getByTestId(`${TEST_ID}-size`)).toHaveTextContent(locale === 'ar' ? '٩٫٨ م.ب' : '9.8 MB');
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/hadith/components/HadithDownloadSheet.tsx')).toEqual([]);
  });
});
