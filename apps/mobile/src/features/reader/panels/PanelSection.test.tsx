import { Text } from 'react-native';

import { themes } from '@/core/theme';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { PanelSection } from './PanelSection';

describe('PanelSection', () => {
  it.each(locales)('renders its title as a muted header above the content in %s', async (locale) => {
    const title = locale === 'ar' ? 'تظليل' : 'Highlight';
    const view = await renderUi(
      <PanelSection testID="section" title={title}>
        <Text>content</Text>
      </PanelSection>,
      { locale },
    );

    const header = view.getByRole('header', { name: title });
    expect(header).toBeOnTheScreen();
    expect(flatStyle(header.props.style).color).toBe(themes.light.colors.inkMuted);
    expect(view.getByText('content')).toBeOnTheScreen();
    expect(view.getByTestId('section')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/panels/PanelSection.tsx')).toEqual([]);
  });
});
