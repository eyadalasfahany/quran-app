import { screen } from '@testing-library/react-native';

import { featureComponentLiterals } from '../../../../jest/ui-source';
import { renderUi } from '../../../../jest/render-ui';
import { DuasAttributionLine } from './DuasAttributionLine';

describe('DuasAttributionLine', () => {
  it('shows the attribution copy', async () => {
    await renderUi(<DuasAttributionLine />);
    expect(screen.getByTestId('duas-attribution-line')).toBeOnTheScreen();
  });

  it('renders in English', async () => {
    await renderUi(<DuasAttributionLine />, { locale: 'en' });
    expect(screen.getByTestId('duas-attribution-line')).toBeOnTheScreen();
  });

  it('uses i18n only', () => {
    expect(featureComponentLiterals('features/duas/components/DuasAttributionLine.tsx')).toEqual([]);
  });
});
