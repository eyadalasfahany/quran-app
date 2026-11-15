import { screen } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { DuasHomeSkeleton } from './DuasHomeSkeleton';

describe('DuasHomeSkeleton', () => {
  it('draws one pulsing group while the content opens', async () => {
    await renderUi(<DuasHomeSkeleton />);

    expect(screen.getByTestId('duas-home-skeleton')).toBeOnTheScreen();
  });

  it('is not a control: no button and no header is announced', async () => {
    await renderUi(<DuasHomeSkeleton />);

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('header')).toBeNull();
  });

  it('renders in English with the same group', async () => {
    await renderUi(<DuasHomeSkeleton />, { locale: 'en' });

    expect(screen.getByTestId('duas-home-skeleton')).toBeOnTheScreen();
  });

  it('uses no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/duas/components/DuasHomeSkeleton.tsx')).toEqual([]);
  });
});
