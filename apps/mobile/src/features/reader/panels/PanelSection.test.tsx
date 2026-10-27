import { Text } from 'react-native';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { locales, renderUi } from '../../../../jest/render-ui';
import { PanelSection } from './PanelSection';

describe('PanelSection', () => {
  it.each(locales)('renders its title as a header above the content in %s', async (locale) => {
    const view = await renderUi(
      <PanelSection testID="section" title={locale === 'ar' ? 'تظليل' : 'Highlight'}>
        <Text>content</Text>
      </PanelSection>,
      { locale },
    );

    expect(view.getByRole('header', { name: locale === 'ar' ? 'تظليل' : 'Highlight' })).toBeOnTheScreen();
    expect(view.getByText('content')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/panels/PanelSection.tsx')).toEqual([]);
  });
});
