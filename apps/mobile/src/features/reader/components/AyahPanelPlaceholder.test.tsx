import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { locales, renderUi } from '../../../../jest/render-ui';
import { AyahPanelPlaceholder } from './AyahPanelPlaceholder';

describe('AyahPanelPlaceholder', () => {
  it.each(locales)('names the active tab in %s', async (locale) => {
    const view = await renderUi(<AyahPanelPlaceholder tab="tafsir" />, { locale });
    expect(view.getByText(locale === 'ar' ? 'التفسير' : 'Tafsir')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/components/AyahPanelPlaceholder.tsx')).toEqual([]);
  });
});
