import { fireEvent } from '@testing-library/react-native';
import type { ComponentProps } from 'react';

import { locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { ReciterSurahRow } from './ReciterSurahRow';

// A row's action is labelled with the action and then the row's title («تنزيل البقرة»).
const rowAction = (label: string) => new RegExp(`^${label} `);

const handlers = () => ({
  onCancel: jest.fn(),
  onDelete: jest.fn(),
  onDownload: jest.fn(),
  onPlay: jest.fn(),
});

function renderRow(props: Partial<ComponentProps<typeof ReciterSurahRow>> = {}, locale: 'ar' | 'en' = 'ar') {
  return renderUi(
    <ReciterSurahRow
      progress={0}
      sizeBytes={null}
      status={undefined}
      testID="surah"
      title="الفاتحة"
      {...handlers()}
      {...props}
    />,
    { locale },
  );
}

describe('ReciterSurahRow', () => {
  describe('states', () => {
    it('offers the download for a surah with no row, and calls onDownload', async () => {
      const h = handlers();
      const view = await renderRow({ ...h });

      expect(view.getByText('الفاتحة')).toBeOnTheScreen();
      expect(view.queryByRole('progressbar')).toBeNull();
      await fireEvent.press(view.getByRole('button', { name: /^تنزيل / }));

      expect(h.onDownload).toHaveBeenCalledTimes(1);
      expect(h.onCancel).not.toHaveBeenCalled();
    });

    it('shows the failure as the subtitle and offers the download again', async () => {
      const h = handlers();
      const view = await renderRow({ ...h, status: 'failed' });

      expect(view.getByText('تعذّر التنزيل')).toBeOnTheScreen();
      await fireEvent.press(view.getByRole('button', { name: /^تنزيل / }));

      expect(h.onDownload).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['queued', 'في الانتظار'],
      ['waiting_wifi', 'بانتظار Wi-Fi'],
      ['paused', 'متوقف'],
      ['downloading', 'جارٍ التنزيل'],
    ] as const)('shows %s as a bar with the stop button and the subtitle «%s»', async (status, text) => {
      const h = handlers();
      const view = await renderRow({ ...h, status, progress: 0.4 });

      expect(view.getByText(text)).toBeOnTheScreen();
      expect(view.getByRole('progressbar').props.accessibilityValue).toEqual({ min: 0, max: 100, now: 40 });
      await fireEvent.press(view.getByRole('button', { name: /^إيقاف التنزيل / }));

      expect(h.onCancel).toHaveBeenCalledTimes(1);
      expect(h.onDownload).not.toHaveBeenCalled();
    });

    it('shows an installed surah with its size in MB, and the play and delete buttons', async () => {
      const h = handlers();
      const view = await renderRow({ ...h, status: 'done', sizeBytes: 5_033_165 });

      expect(view.getByText('٤٫٨ م.ب')).toBeOnTheScreen();
      expect(view.queryByRole('progressbar')).toBeNull();
      await fireEvent.press(view.getByRole('button', { name: /^تشغيل / }));
      await fireEvent.press(view.getByRole('button', { name: rowAction('حذف التنزيل') }));

      expect(h.onPlay).toHaveBeenCalledTimes(1);
      expect(h.onDelete).toHaveBeenCalledTimes(1);
      expect(h.onDownload).not.toHaveBeenCalled();
    });

    it('shows an installed surah with no subtitle when its size is unknown', async () => {
      const view = await renderRow({ status: 'done', sizeBytes: null });

      expect(view.queryByText(/م\.ب/)).toBeNull();
      expect(view.getByRole('button', { name: rowAction('حذف التنزيل') })).toBeOnTheScreen();
    });

    it('draws the divider when asked', async () => {
      const view = await renderRow({ showDivider: true });

      expect(view.getByTestId('surah')).toBeOnTheScreen();
    });
  });

  it.each(locales)('translates the states under %s', async (locale) => {
    const view = await renderRow({ status: 'waiting_wifi', progress: 0.1, title: 'Al-Fatihah' }, locale);

    expect(view.getByText(locale === 'en' ? 'Waiting for Wi-Fi' : 'بانتظار Wi-Fi')).toBeOnTheScreen();
    expect(view.getByRole('button', { name: rowAction(locale === 'en' ? 'Stop download' : 'إيقاف التنزيل') })).toBeOnTheScreen();
  });

  it('shows the size in English as MB', async () => {
    const view = await renderRow({ status: 'done', sizeBytes: 5_033_165 }, 'en');

    expect(view.getByText('4.8 MB')).toBeOnTheScreen();
    expect(view.getByRole('button', { name: /^Play / })).toBeOnTheScreen();
    expect(view.getByRole('button', { name: /^Delete download / })).toBeOnTheScreen();
  });

  it('says a surah that is not downloaded is not available offline, while the device is offline', async () => {
    const view = await renderRow({ offline: true, status: undefined }, 'ar');

    expect(view.getByText('غير متاح دون اتصال')).toBeOnTheScreen();
    expect(view.getByRole('button', { name: rowAction('تنزيل') })).toBeOnTheScreen();
  });

  it('says it in English too', async () => {
    const view = await renderRow({ offline: true, status: undefined }, 'en');

    expect(view.getByText('Not available offline')).toBeOnTheScreen();
  });

  it('asks for one connection to verify a finished download that needs it', async () => {
    const view = await renderRow({ status: 'done', sizeBytes: 5_033_165, verifyNeeded: true }, 'ar');

    expect(view.getByText('اتصل مرة للتحقق من التنزيلات')).toBeOnTheScreen();
    expect(view.queryByText('٤٫٨ م.ب')).toBeNull();
  });

  it('keeps the play button for a finished download that needs verifying, so the player can say why', async () => {
    const h = handlers();
    const view = await renderRow({ ...h, status: 'done', verifyNeeded: true }, 'en');

    await fireEvent.press(view.getByRole('button', { name: /^Play / }));
    expect(h.onPlay).toHaveBeenCalled();
  });

  describe('while its surah starts', () => {
    it.each(locales)('shows pause in the buffering ring, busy, with the play label in %s', async (locale) => {
      const h = handlers();
      const view = await renderRow({ ...h, status: 'done', sizeBytes: 5_033_165, starting: true }, locale);
      const play = view.getByRole('button', { name: new RegExp(`^${locale === 'en' ? 'Play' : 'تشغيل'} `) });

      expect(view.getByTestId('surah-buffering', { includeHiddenElements: true })).toBeTruthy();
      expect(view.getByTestId('surah-pause', { includeHiddenElements: true })).toBeTruthy();
      expect(play.props.accessibilityState).toEqual({ busy: true });
      await fireEvent.press(play);
      expect(h.onPlay).not.toHaveBeenCalled();
    });

    it('draws no ring for a surah that is not starting', async () => {
      const view = await renderRow({ status: 'done', sizeBytes: 5_033_165, starting: false });

      expect(view.queryByTestId('surah-buffering', { includeHiddenElements: true })).toBeNull();
    });
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/audio/components/ReciterSurahRow.tsx')).toEqual([]);
  });
});
