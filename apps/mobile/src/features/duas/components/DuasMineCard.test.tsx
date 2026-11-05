import { screen } from '@testing-library/react-native';

import { press } from '../../../../jest/azkar-ui-fixtures';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { renderUi } from '../../../../jest/render-ui';
import { DuasMineCard } from './DuasMineCard';

describe('DuasMineCard', () => {
  it('renders the brand card with count caption and calls onPress', async () => {
    const onPress = jest.fn();
    await renderUi(<DuasMineCard count={3} onPress={onPress} />);

    expect(screen.getByText(/٣ أدعية · على جهازك فقط/)).toBeOnTheScreen();
    expect(screen.getByText('فتح')).toBeOnTheScreen();
    await press(screen.getByTestId('duas-mine-card'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows add action when count is zero', async () => {
    await renderUi(<DuasMineCard count={0} onPress={jest.fn()} />);
    expect(screen.getByText('لا أدعية · على جهازك فقط')).toBeOnTheScreen();
    expect(screen.getByText('إضافة')).toBeOnTheScreen();
  });

  it('renders in English', async () => {
    await renderUi(<DuasMineCard count={2} onPress={jest.fn()} />, { locale: 'en' });
    expect(screen.getByText(/2 duas · On this device only/)).toBeOnTheScreen();
    expect(screen.getByText('Open')).toBeOnTheScreen();
  });

  it('uses i18n only', () => {
    expect(featureComponentLiterals('features/duas/components/DuasMineCard.tsx')).toEqual([]);
  });
});
