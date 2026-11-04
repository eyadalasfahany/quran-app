import { screen } from '@testing-library/react-native';

import { press } from '../../../../jest/azkar-ui-fixtures';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { renderUi } from '../../../../jest/render-ui';
import { DuaLinkRow } from './DuaLinkRow';

describe('DuaLinkRow', () => {
  it('calls onPress', async () => {
    const onPress = jest.fn();
    await renderUi(<DuaLinkRow onPress={onPress} title="FIXTURE link title" />);
    await press(screen.getByRole('button', { name: 'FIXTURE link title' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders in English', async () => {
    await renderUi(<DuaLinkRow onPress={jest.fn()} title="FIXTURE link title" />, { locale: 'en' });
    expect(screen.getByText('FIXTURE link title')).toBeOnTheScreen();
  });

  it('uses props only in source', () => {
    expect(featureComponentLiterals('features/duas/components/DuaLinkRow.tsx')).toEqual([]);
  });
});
