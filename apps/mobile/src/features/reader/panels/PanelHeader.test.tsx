import { fireEvent } from '@testing-library/react-native';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { PanelHeader } from './PanelHeader';

describe('PanelHeader', () => {
  it('shows «الفاتحة · الآية ٢» and the page and juz in Arabic-Indic digits', async () => {
    const view = await renderUi(<PanelHeader juz={1} page={1} surahName="الفاتحة" verseNumber={2} />);

    expect(view.getByRole('header', { name: 'الفاتحة · الآية ٢' })).toBeOnTheScreen();
    expect(view.getByTestId('panel-header-place')).toHaveTextContent('صفحة ١ · الجزء ١');
  });

  it('uses Western digits in English and keeps the Arabic surah name', async () => {
    const view = await renderUi(<PanelHeader juz={30} page={604} surahName="الناس" verseNumber={6} />, { locale: 'en' });

    expect(view.getByRole('header', { name: 'الناس · Ayah 6' })).toBeOnTheScreen();
    expect(view.getByTestId('panel-header-place')).toHaveTextContent('Page 604 · Juz 30');
  });

  it.each(locales)('sets the Quranic surah name right to left in %s', async (locale) => {
    const view = await renderUi(<PanelHeader juz={1} page={1} surahName="الفاتحة" verseNumber={2} />, { locale });

    expect(flatStyle(view.getByTestId('panel-header-surah').props.style).writingDirection).toBe('rtl');
    expect(flatStyle(view.getByTestId('panel-header-ayah').props.style).writingDirection).toBeUndefined();
  });

  it('hides the place caption when the page is unknown', async () => {
    const view = await renderUi(<PanelHeader juz={null} page={null} surahName="الفاتحة" verseNumber={2} />);

    expect(view.queryByTestId('panel-header-place')).toBeNull();
  });

  it('shows a labelled close button only when onClose is given', async () => {
    const onClose = jest.fn();
    const view = await renderUi(<PanelHeader juz={1} onClose={onClose} page={1} surahName="الفاتحة" verseNumber={2} />, {
      locale: 'en',
    });

    await fireEvent.press(view.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has no close button without onClose', async () => {
    const view = await renderUi(<PanelHeader juz={1} page={1} surahName="الفاتحة" verseNumber={2} />);

    expect(view.queryByRole('button')).toBeNull();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/panels/PanelHeader.tsx')).toEqual([]);
  });
});
