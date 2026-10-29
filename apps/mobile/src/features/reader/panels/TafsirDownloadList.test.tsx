import { fireEvent } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import { I18nManager } from 'react-native';

import { themes } from '@/core/theme';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { TafsirDownloadList, type TafsirDownloadItem } from './TafsirDownloadList';

const light = themes.light.colors;

const items: TafsirDownloadItem[] = [
  {
    resourceId: 90,
    title: 'التفسير الميسر',
    subtitle: 'عبد الله بن عبد المحسن التركي · ١٫٢ م.ب',
    state: 'available',
    progress: 0,
  },
  { resourceId: 14, title: 'تفسير ابن كثير', subtitle: 'جارٍ التنزيل · ٤٫٨ م.ب', state: 'downloading', progress: 0.4 },
  {
    resourceId: 926,
    title: 'تفسير الجلالين',
    subtitle: 'جلال الدين المحلي · ٠٫٩ م.ب',
    state: 'installed',
    progress: 0,
  },
];

function renderList(props: Partial<ComponentProps<typeof TafsirDownloadList>> & { locale?: 'ar' | 'en' } = {}) {
  const { locale = 'ar', ...rest } = props;
  return renderUi(
    <TafsirDownloadList
      items={items}
      onCancel={jest.fn()}
      onDownload={jest.fn()}
      onOpen={jest.fn()}
      testID="list"
      {...rest}
    />,
    { locale },
  );
}

describe('TafsirDownloadList', () => {
  it('renders the intro line above one row per item', async () => {
    const view = await renderList();

    expect(view.getByText('نزّل تفسيرًا لقراءته بدون إنترنت')).toBeOnTheScreen();
    expect(view.getByText('التفسير الميسر')).toBeOnTheScreen();
    expect(view.getByText('تفسير ابن كثير')).toBeOnTheScreen();
    expect(view.getByText('تفسير الجلالين')).toBeOnTheScreen();
    expect(view.getByTestId('list-row-90')).toBeOnTheScreen();
    expect(view.getByTestId('list-row-14')).toBeOnTheScreen();
    expect(view.getByTestId('list-row-926')).toBeOnTheScreen();
  });

  it('renders no card rows when there are no items', async () => {
    const view = await renderList({ items: [] });

    expect(view.getByText('نزّل تفسيرًا لقراءته بدون إنترنت')).toBeOnTheScreen();
    expect(view.queryByRole('button')).toBeNull();
  });

  describe('row states', () => {
    it('shows the download pill for an available tafsir', async () => {
      const view = await renderList();

      expect(view.getByTestId('list-row-90-action')).toBeOnTheScreen();
      expect(view.getByRole('button', { name: 'تنزيل' })).toBeOnTheScreen();
    });

    it('shows the stop button and progress bar for a downloading tafsir', async () => {
      const view = await renderList();

      expect(view.getByRole('button', { name: 'إيقاف التنزيل' })).toBeOnTheScreen();
      expect(view.getByRole('progressbar').props.accessibilityValue).toEqual({ min: 0, max: 100, now: 40 });
    });

    it('shows the open pill for an installed tafsir', async () => {
      const view = await renderList();

      expect(view.getByRole('button', { name: 'عرض' })).toBeOnTheScreen();
    });
  });

  describe('presses', () => {
    it('calls onDownload with the id of the row pressed', async () => {
      const onDownload = jest.fn();
      const onCancel = jest.fn();
      const onOpen = jest.fn();
      const view = await renderList({ onDownload, onCancel, onOpen });

      fireEvent.press(view.getByTestId('list-row-90-action'));

      expect(onDownload).toHaveBeenCalledTimes(1);
      expect(onDownload).toHaveBeenCalledWith(90);
      expect(onCancel).not.toHaveBeenCalled();
      expect(onOpen).not.toHaveBeenCalled();
    });

    it('calls onCancel with the id of the row pressed', async () => {
      const onDownload = jest.fn();
      const onCancel = jest.fn();
      const view = await renderList({ onDownload, onCancel });

      fireEvent.press(view.getByRole('button', { name: 'إيقاف التنزيل' }));

      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onCancel).toHaveBeenCalledWith(14);
      expect(onDownload).not.toHaveBeenCalled();
    });

    it('calls onOpen with the id of the row pressed', async () => {
      const onDownload = jest.fn();
      const onOpen = jest.fn();
      const view = await renderList({ onDownload, onOpen });

      fireEvent.press(view.getByRole('button', { name: 'عرض' }));

      expect(onOpen).toHaveBeenCalledTimes(1);
      expect(onOpen).toHaveBeenCalledWith(926);
      expect(onDownload).not.toHaveBeenCalled();
    });
  });

  describe('card', () => {
    it('draws one card with no padding, a raised surface, a hairline border and clipped corners', async () => {
      const view = await renderList();
      const card = flatStyle(view.getByTestId('list-card').props.style);

      expect(card.backgroundColor).toBe(light.surfaceRaised);
      expect(card.borderRadius).toBe(themes.light.radius.lg);
      expect(card.borderWidth).toBe(themes.light.stroke.hairline);
      expect(card.borderColor).toBe(light.line);
      expect(card.overflow).toBe('hidden');
      expect(card.padding).toBeUndefined();
      expect(card.paddingHorizontal).toBeUndefined();
    });

    it('draws a divider on every row except the last', async () => {
      const view = await renderList();

      expect(flatStyle(view.getByTestId('list-row-90').props.style).borderBottomWidth).toBe(
        themes.light.stroke.hairline,
      );
      expect(flatStyle(view.getByTestId('list-row-14').props.style).borderBottomWidth).toBe(
        themes.light.stroke.hairline,
      );
      expect(flatStyle(view.getByTestId('list-row-926').props.style).borderBottomWidth).toBeUndefined();
    });
  });

  describe('intro line', () => {
    it('is a muted label with the frame line height and inset', async () => {
      const view = await renderList();
      const intro = flatStyle(view.getByText('نزّل تفسيرًا لقراءته بدون إنترنت').props.style);

      expect(intro.color).toBe(light.inkMuted);
      expect(intro.lineHeight).toBe(themes.light.size.creditLineHeight);
      expect(intro.paddingHorizontal).toBe(themes.light.size.frameInset);
    });

    it('sits gap-spaced above the card', async () => {
      const view = await renderList();

      expect(flatStyle(view.getByTestId('list').props.style).gap).toBe(themes.light.size.sheetGap);
    });

    it.each(locales)('is left out with showIntro off, keeping the card, in %s', async (locale) => {
      const view = await renderList({ locale, showIntro: false });

      expect(view.queryByText(locale === 'ar' ? 'نزّل تفسيرًا لقراءته بدون إنترنت' : 'Download a tafsir to read it offline')).toBeNull();
      expect(view.getByTestId('list-card')).toBeOnTheScreen();
      expect(view.getByTestId('list-row-90')).toBeOnTheScreen();
    });
  });

  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderList({ locale });

    expect(
      view.getByText(locale === 'ar' ? 'نزّل تفسيرًا لقراءته بدون إنترنت' : 'Download a tafsir to read it offline'),
    ).toBeOnTheScreen();
    expect(view.getByRole('button', { name: locale === 'ar' ? 'تنزيل' : 'Download' })).toBeOnTheScreen();
    expect(I18nManager.isRTL).toBe(locale === 'ar');
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/reader/panels/TafsirDownloadList.tsx')).toEqual([]);
  });
});
