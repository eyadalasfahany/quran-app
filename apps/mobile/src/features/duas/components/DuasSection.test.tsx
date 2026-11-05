import { screen } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { DuasSection } from './DuasSection';
import { UiText } from '@/shared/ui';

describe('DuasSection', () => {
  it('renders the section heading as a header', async () => {
    await renderUi(
      <DuasSection testID="duas-fixture-section" title="FIXTURE heading">
        <UiText>FIXTURE child</UiText>
      </DuasSection>,
    );
    expect(screen.getByTestId('duas-fixture-section')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'FIXTURE heading' })).toBeOnTheScreen();
    expect(screen.getByText('FIXTURE child')).toBeOnTheScreen();
  });

  it('shows an optional caption under the heading', async () => {
    await renderUi(
      <DuasSection caption="FIXTURE caption" testID="duas-fixture-section" title="FIXTURE heading">
        <UiText>FIXTURE child</UiText>
      </DuasSection>,
    );
    expect(screen.getByText('FIXTURE caption')).toBeOnTheScreen();
  });

  it('omits the caption when not provided', async () => {
    await renderUi(
      <DuasSection testID="duas-fixture-section" title="FIXTURE heading">
        <UiText>FIXTURE child</UiText>
      </DuasSection>,
    );
    expect(screen.queryByText('FIXTURE caption')).toBeNull();
  });

  it('renders in English layout', async () => {
    await renderUi(
      <DuasSection testID="duas-fixture-section" title="FIXTURE heading en">
        <UiText>FIXTURE child</UiText>
      </DuasSection>,
      { locale: 'en' },
    );
    expect(screen.getByRole('header', { name: 'FIXTURE heading en' })).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/duas/components/DuasSection.tsx')).toEqual([]);
  });
});
