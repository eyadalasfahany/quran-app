import { fireEvent } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import { I18nManager } from 'react-native';

import { i18n, type Locale } from '@/core/i18n';
import { themes } from '@/core/theme';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';

import { DownloadRow, type DownloadRowState } from './DownloadRow';

// A row's action is labelled with the action and then the row's title («تنزيل البقرة»).
const rowAction = (label: string) => new RegExp(`^${label} `);

const light = themes.light.colors;

function labels(locale: Locale = 'ar') {
  const t = i18n.getFixedT(locale);
  return {
    delete: t('listen.download.delete'),
    download: t('ui.download.start'),
    cancel: t('ui.download.cancel'),
    open: t('ui.download.open'),
  };
}

function renderRow(
  props: Partial<ComponentProps<typeof DownloadRow>> & { state: DownloadRowState; locale?: Locale },
) {
  const { locale = 'ar', ...rest } = props;
  return renderUi(
    <DownloadRow
      actionLabels={labels(locale)}
      testID="row"
      title="تفسير ابن كثير"
      subtitle="ابن كثير · ٤٫٨ م.ب"
      {...rest}
    />,
    { locale },
  );
}

describe('DownloadRow', () => {
  it('names the row in the download label, so VoiceOver can tell the rows apart', async () => {
    const view = await renderRow({ state: 'available' });
    expect(view.getByRole('button', { name: 'تنزيل تفسير ابن كثير' })).toBeOnTheScreen();
  });

  it('names the row in the stop label', async () => {
    const view = await renderRow({ state: 'downloading', progress: 0.5 });
    expect(view.getByRole('button', { name: 'إيقاف التنزيل تفسير ابن كثير' })).toBeOnTheScreen();
  });

  it('names the row in the open label', async () => {
    const view = await renderRow({ state: 'installed', locale: 'en' });
    expect(view.getByRole('button', { name: 'Open تفسير ابن كثير' })).toBeOnTheScreen();
  });

  describe('available', () => {
    it('shows the download pill and no stop button or progress bar', async () => {
      const view = await renderRow({ state: 'available' });

      expect(view.getByRole('button', { name: /^تنزيل / })).toBeOnTheScreen();
      expect(view.queryByRole('progressbar')).toBeNull();
      expect(view.queryByRole('button', { name: /^إيقاف التنزيل / })).toBeNull();
      expect(view.queryByRole('button', { name: /^عرض / })).toBeNull();
    });

    it('calls onDownload, and no other action', async () => {
      const onDownload = jest.fn();
      const onCancel = jest.fn();
      const onOpen = jest.fn();
      const view = await renderRow({ state: 'available', onDownload, onCancel, onOpen });

      await fireEvent.press(view.getByRole('button', { name: /^تنزيل / }));

      expect(onDownload).toHaveBeenCalledTimes(1);
      expect(onCancel).not.toHaveBeenCalled();
      expect(onOpen).not.toHaveBeenCalled();
    });

    it('keeps both controls at least 44 pt', async () => {
      const view = await renderRow({ state: 'available' });
      const pill = flatStyle(view.getByRole('button', { name: /^تنزيل / }).props.style);

      expect(pill.minHeight).toBeGreaterThanOrEqual(44);
      expect(pill.minWidth).toBeGreaterThanOrEqual(44);
    });

    it('sets the pill label in the brand colour', async () => {
      const view = await renderRow({ state: 'available' });

      expect(flatStyle(view.getByText('تنزيل').props.style).color).toBe(light.brand);
    });
  });

  describe('downloading', () => {
    it('shows a stop button labelled as the cancel action, and no download pill', async () => {
      const view = await renderRow({ state: 'downloading', progress: 0.4 });

      expect(view.getByRole('button', { name: /^إيقاف التنزيل / })).toBeOnTheScreen();
      expect(view.queryByRole('button', { name: /^تنزيل / })).toBeNull();
    });

    it('calls onCancel when the stop button is pressed', async () => {
      const onCancel = jest.fn();
      const onDownload = jest.fn();
      const view = await renderRow({ state: 'downloading', progress: 0.4, onCancel, onDownload });

      await fireEvent.press(view.getByRole('button', { name: /^إيقاف التنزيل / }));

      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onDownload).not.toHaveBeenCalled();
    });

    it('exposes the progress as a progressbar value', async () => {
      const view = await renderRow({ state: 'downloading', progress: 0.4 });

      expect(view.getByRole('progressbar').props.accessibilityValue).toEqual({ min: 0, max: 100, now: 40 });
    });

    it.each([
      [undefined, 0],
      [-0.2, 0],
      [0.456, 46],
      [1.7, 100],
    ])('clamps progress %p to a value of %p', async (progress, now) => {
      const view = await renderRow({ state: 'downloading', progress });

      expect(view.getByRole('progressbar').props.accessibilityValue.now).toBe(now);
    });

    it('fills the track to the progress percentage', async () => {
      const view = await renderRow({ state: 'downloading', progress: 0.4, testID: 'row' });
      const track = view.getByRole('progressbar');
      const fill = flatStyle(view.getByTestId('row-progress-fill').props.style);

      expect(fill.width).toBe('40%');
      expect(fill.backgroundColor).toBe(light.brand);
      expect(fill.height).toBe(4);
      expect(fill.borderRadius).toBe(2);
      expect(flatStyle(track.props.style).backgroundColor).toBe(light.fillSecondary);
    });

    it('places the progress bar under the subtitle', async () => {
      const view = await renderRow({ state: 'downloading', progress: 0.4 });
      const subtitle = view.getByText('ابن كثير · ٤٫٨ م.ب');
      const bar = view.getByRole('progressbar');

      expect(flatStyle(bar.props.style).marginTop).toBe(6);
      expect(subtitle).toBeOnTheScreen();
    });

    it.each(locales)('starts the fill at the leading edge under %s', async (locale) => {
      const view = await renderRow({ state: 'downloading', progress: 0.58, locale, testID: 'row' });
      const track = flatStyle(view.getByRole('progressbar').props.style);
      const fill = flatStyle(view.getByTestId('row-progress-fill').props.style);

      // Row direction follows the layout direction: the fill starts on the right in Arabic and the left in English.
      expect(I18nManager.isRTL).toBe(locale === 'ar');
      expect(track.flexDirection).toBe('row');
      expect(track.overflow).toBe('hidden');
      expect(fill).not.toHaveProperty('left');
      expect(fill).not.toHaveProperty('right');
      expect(fill.width).toBe('58%');
    });
  });

  describe('installed', () => {
    it('shows the open pill and no progress bar', async () => {
      const view = await renderRow({ state: 'installed' });

      expect(view.getByRole('button', { name: /^عرض / })).toBeOnTheScreen();
      expect(view.queryByRole('progressbar')).toBeNull();
      expect(view.queryByRole('button', { name: /^تنزيل / })).toBeNull();
    });

    it('calls onOpen, not onDownload', async () => {
      const onOpen = jest.fn();
      const onDownload = jest.fn();
      const view = await renderRow({ state: 'installed', onOpen, onDownload });

      await fireEvent.press(view.getByRole('button', { name: /^عرض / }));

      expect(onOpen).toHaveBeenCalledTimes(1);
      expect(onDownload).not.toHaveBeenCalled();
    });

    it('draws no delete button unless onDelete is given', async () => {
      const view = await renderRow({ state: 'installed' });

      expect(view.queryByRole('button', { name: rowAction('حذف التنزيل') })).toBeNull();
    });

    it('draws a 44 pt delete button after the open pill, and calls onDelete from it', async () => {
      const onDelete = jest.fn();
      const onOpen = jest.fn();
      const view = await renderRow({ state: 'installed', onDelete, onOpen, testID: 'row' });
      const remove = view.getByRole('button', { name: rowAction('حذف التنزيل') });
      const size = flatStyle(remove.props.style);

      expect(size.height).toBeGreaterThanOrEqual(44);
      expect(size.width).toBeGreaterThanOrEqual(44);
      await fireEvent.press(remove);

      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onOpen).not.toHaveBeenCalled();
    });

    it('draws the delete button in English', async () => {
      const onDelete = jest.fn();
      const view = await renderRow({ state: 'installed', onDelete, locale: 'en' });

      await fireEvent.press(view.getByRole('button', { name: /^Delete download / }));

      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it('draws no delete button while downloading, even with onDelete', async () => {
      const view = await renderRow({ state: 'downloading', progress: 0.2, onDelete: jest.fn() });

      expect(view.queryByRole('button', { name: rowAction('حذف التنزيل') })).toBeNull();
    });

    it('shows pause in a buffering ring, busy, while starting, and keeps the open label', async () => {
      const view = await renderRow({ state: 'installed', starting: true, testID: 'row' });
      const pill = view.getByRole('button', { name: /^عرض / });

      expect(view.getByTestId('row-buffering', { includeHiddenElements: true })).toBeTruthy();
      expect(view.getByTestId('row-pause', { includeHiddenElements: true })).toBeTruthy();
      expect(pill.props.accessibilityState).toEqual({ busy: true });
      expect(flatStyle(view.getByText('عرض').props.style).opacity).toBe(0);
    });

    it('keeps the pill size and colours while starting', async () => {
      const idle = await renderRow({ state: 'installed', testID: 'row' });
      const starting = await renderRow({ state: 'installed', starting: true, testID: 'row' });

      expect(flatStyle(starting.getByRole('button', { name: /^عرض / }).props.style)).toEqual(
        flatStyle(idle.getByRole('button', { name: /^عرض / }).props.style),
      );
    });

    it('ignores taps on the open pill while starting', async () => {
      const onOpen = jest.fn();
      const view = await renderRow({ state: 'installed', starting: true, onOpen });

      await fireEvent.press(view.getByRole('button', { name: /^عرض / }));

      expect(onOpen).not.toHaveBeenCalled();
    });

    it('draws no ring and no busy state when not starting', async () => {
      const view = await renderRow({ state: 'installed', testID: 'row' });

      expect(view.queryByTestId('row-buffering', { includeHiddenElements: true })).toBeNull();
      expect(view.getByRole('button', { name: /^عرض / }).props.accessibilityState).not.toMatchObject({ busy: true });
      expect(flatStyle(view.getByText('عرض').props.style).opacity).toBeUndefined();
    });

    it('shows the start in English too, with the open label unchanged', async () => {
      const onOpen = jest.fn();
      const view = await renderRow({ state: 'installed', starting: true, onOpen, locale: 'en', testID: 'row' });
      const pill = view.getByRole('button', { name: /^Open / });

      expect(view.getByTestId('row-buffering', { includeHiddenElements: true })).toBeTruthy();
      expect(pill.props.accessibilityState).toEqual({ busy: true });
      await fireEvent.press(pill);
      expect(onOpen).not.toHaveBeenCalled();
    });
  });

  it('does not draw the start on the download pill, which starts no audio', async () => {
    const view = await renderRow({ state: 'available', starting: true, testID: 'row' });

    expect(view.queryByTestId('row-buffering', { includeHiddenElements: true })).toBeNull();
    expect(view.getByRole('button', { name: /^تنزيل / }).props.accessibilityState).not.toMatchObject({ busy: true });
  });

  describe('divider', () => {
    it('draws no divider by default', async () => {
      const view = await renderRow({ state: 'available' });

      expect(flatStyle(view.getByTestId('row').props.style).borderBottomWidth).toBeUndefined();
    });

    it('draws a hairline in the line colour when showDivider is set', async () => {
      const view = await renderRow({ state: 'available', showDivider: true });
      const row = flatStyle(view.getByTestId('row').props.style);

      expect(row.borderBottomWidth).toBe(themes.light.stroke.hairline);
      expect(row.borderBottomColor).toBe(light.line);
    });
  });

  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderRow({ state: 'downloading', progress: 0.1, locale });

    expect(view.getByText('تفسير ابن كثير')).toBeOnTheScreen();
    expect(view.getByRole('button', { name: new RegExp(`^${labels(locale).cancel} `) })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('DownloadRow.tsx')).toEqual([]);
  });
});
