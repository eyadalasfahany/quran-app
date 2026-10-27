import { fireEvent } from '@testing-library/react-native';

import { themes } from '@/core/theme';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { PanelHeader } from './PanelHeader';

describe('PanelHeader', () => {
  it('shows «الفاتحة · الآية ٢» as one ink title and the page and juz in Arabic-Indic digits', async () => {
    const view = await renderUi(<PanelHeader juz={1} page={1} surahName="الفاتحة" verseNumber={2} />);

    expect(view.getByRole('header', { name: 'الفاتحة · الآية ٢' })).toBeOnTheScreen();
    expect(view.getByTestId('panel-header-title')).toHaveTextContent('الفاتحة · الآية ٢');
    expect(flatStyle(view.getByTestId('panel-header-title').props.style).color).toBe(themes.light.colors.ink);
    expect(view.getByTestId('panel-header-subtitle')).toHaveTextContent('صفحة ١ · الجزء ١');
  });

  it('uses Western digits in English and keeps the Arabic surah name', async () => {
    const view = await renderUi(<PanelHeader juz={30} page={604} surahName="الناس" verseNumber={6} />, { locale: 'en' });

    expect(view.getByRole('header', { name: 'الناس · Ayah 6' })).toBeOnTheScreen();
    expect(view.getByTestId('panel-header-subtitle')).toHaveTextContent('Page 604 · Juz 30');
  });

  it.each(locales)('sets the place in muted ink under the title in %s', async (locale) => {
    const view = await renderUi(<PanelHeader juz={1} page={1} surahName="الفاتحة" verseNumber={2} />, { locale });

    expect(flatStyle(view.getByTestId('panel-header-subtitle').props.style).color).toBe(themes.light.colors.inkMuted);
    expect(view.getByTestId('panel-header-title')).toHaveTextContent(locale === 'ar' ? 'الفاتحة · الآية ٢' : 'الفاتحة · Ayah 2');
  });

  it('hides the place caption when the page is unknown', async () => {
    const view = await renderUi(<PanelHeader juz={null} page={null} surahName="الفاتحة" verseNumber={2} />);

    expect(view.queryByTestId('panel-header-subtitle')).toBeNull();
  });

  it('shows a labelled close button only when onClose is given', async () => {
    const onClose = jest.fn();
    const view = await renderUi(<PanelHeader juz={1} onClose={onClose} page={1} surahName="الفاتحة" verseNumber={2} />, {
      locale: 'en',
    });

    await fireEvent.press(view.getByTestId('panel-header-close'));
    expect(view.getByRole('button', { name: 'Close' })).toBeOnTheScreen();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('uses a custom close label', async () => {
    const view = await renderUi(
      <PanelHeader closeLabel="إغلاق اللوحة" juz={1} onClose={jest.fn()} page={1} surahName="الفاتحة" verseNumber={2} />,
    );

    expect(view.getByRole('button', { name: 'إغلاق اللوحة' })).toBeOnTheScreen();
  });

  it('has no close button without onClose', async () => {
    const view = await renderUi(<PanelHeader juz={1} page={1} surahName="الفاتحة" verseNumber={2} />);

    expect(view.queryByRole('button')).toBeNull();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/panels/PanelHeader.tsx')).toEqual([]);
  });
});
