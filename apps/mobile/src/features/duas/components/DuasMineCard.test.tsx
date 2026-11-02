import { screen } from '@testing-library/react-native';

import { press } from '../../../../jest/azkar-ui-fixtures';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { renderUi } from '../../../../jest/render-ui';
import { DuasMineCard } from './DuasMineCard';

describe('DuasMineCard', () => {
  it('renders the brand card and calls onPress', async () => {
    const onPress = jest.fn();
    await renderUi(<DuasMineCard onPress={onPress} />);

    expect(screen.getByRole('button', { name: 'من كتابتك، أدعيتي' })).toBeOnTheScreen();
    await press(screen.getByTestId('duas-mine-card'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders in English', async () => {
    await renderUi(<DuasMineCard onPress={jest.fn()} />, { locale: 'en' });
    expect(screen.getByRole('button', { name: 'Your own, My duas' })).toBeOnTheScreen();
  });

  it('uses i18n only', () => {
    expect(featureComponentLiterals('features/duas/components/DuasMineCard.tsx')).toEqual([]);
  });
});
