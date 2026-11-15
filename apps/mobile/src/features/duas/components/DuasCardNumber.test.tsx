import { screen } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { DuasCardNumber } from './DuasCardNumber';

describe('DuasCardNumber', () => {
  it('shows the number in Arabic-Indic digits', async () => {
    await renderUi(<DuasCardNumber number={12} />);

    expect(screen.getByText('١٢', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('shows the same digits in English, as the Azkar medallion does', async () => {
    await renderUi(<DuasCardNumber number={3} />, { locale: 'en' });

    expect(screen.getByText('٣', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('is hidden from accessibility, because the card carries the label', async () => {
    await renderUi(<DuasCardNumber number={1} testID="duas-card-number" />);

    expect(screen.getByTestId('duas-card-number', { includeHiddenElements: true }).props.accessibilityElementsHidden).toBe(true);
  });

  it('uses no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/duas/components/DuasCardNumber.tsx')).toEqual([]);
  });
});
