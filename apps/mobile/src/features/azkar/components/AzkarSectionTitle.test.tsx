import { screen } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { AzkarSectionTitle } from './AzkarSectionTitle';

describe('AzkarSectionTitle', () => {
  it('renders the title as a header', async () => {
    await renderUi(<AzkarSectionTitle title="المواضيع" />);
    expect(screen.getByRole('header', { name: 'المواضيع' })).toBeOnTheScreen();
  });

  it('renders the English title', async () => {
    await renderUi(<AzkarSectionTitle title="Topics" />, { locale: 'en' });
    expect(screen.getByRole('header', { name: 'Topics' })).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/azkar/components/AzkarSectionTitle.tsx')).toEqual([]);
  });
});
