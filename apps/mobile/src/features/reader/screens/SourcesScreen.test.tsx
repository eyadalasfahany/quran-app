import { locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { SourcesScreen } from './SourcesScreen';

describe('SourcesScreen', () => {
  it.each(locales)('lists the QF font credit in %s', async (locale) => {
    const view = await renderUi(<SourcesScreen testID="sources" />, { locale });
    expect(view.getByTestId('sources-qf-fonts')).toBeOnTheScreen();
    expect(view.getByRole('header')).toBeOnTheScreen();
  });

  it('uses theme tokens only', () => {
    expect(featureComponentLiterals('features/reader/screens/SourcesScreen.tsx')).toEqual([]);
  });
});
