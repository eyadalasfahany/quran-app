import { screen } from '@testing-library/react-native';

import { press } from '../../../../jest/azkar-ui-fixtures';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { renderUi } from '../../../../jest/render-ui';
import { DuasSourceRow } from './DuasSourceRow';

describe('DuasSourceRow', () => {
  it('shows title and detail as one button', async () => {
    const onPress = jest.fn();
    await renderUi(<DuasSourceRow detail="FIXTURE detail" onPress={onPress} title="FIXTURE title" />);

    await press(screen.getByRole('button', { name: 'FIXTURE title, FIXTURE detail' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders in English layout', async () => {
    await renderUi(<DuasSourceRow onPress={jest.fn()} title="Hisn" />, { locale: 'en' });
    expect(screen.getByRole('button', { name: 'Hisn' })).toBeOnTheScreen();
  });

  it('renders a non-interactive hint when onPress is omitted', async () => {
    await renderUi(<DuasSourceRow detail="FIXTURE pending" title="FIXTURE title" testID="duas-source-hint" />);
    expect(screen.getByTestId('duas-source-hint')).toBeOnTheScreen();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByLabelText('FIXTURE title, FIXTURE pending')).toBeOnTheScreen();
  });

  it('uses i18n only', () => {
    expect(featureComponentLiterals('features/duas/components/DuasSourceRow.tsx')).toEqual([]);
  });
});
