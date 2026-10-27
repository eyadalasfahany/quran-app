import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { locales, renderUi } from '../../../../jest/render-ui';
import { SheetContainer } from './SheetContainer';

describe('SheetContainer', () => {
  it.each(locales)('shows the verse key in %s', async (locale) => {
    const view = await renderUi(<SheetContainer tab="actions" verseKey="2:255" />, { locale });
    expect(view.getByText('2:255')).toBeOnTheScreen();
    expect(view.getByTestId('sheet-container').props.accessibilityLabel).toBe(locale === 'ar' ? 'خيارات الآية' : 'Ayah actions');
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/components/SheetContainer.tsx')).toEqual([]);
  });
});
