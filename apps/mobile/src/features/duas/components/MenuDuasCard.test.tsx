import { fireEvent } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { MENU_DUAS_ICON, MenuDuasCard } from './MenuDuasCard';

describe('MenuDuasCard', () => {
  it('maps the card glyph to hands.sparkles on iOS and volunteer_activism on Android', () => {
    expect(MENU_DUAS_ICON).toEqual({ ios: 'hands.sparkles', android: 'volunteer_activism' });
  });

  it('shows the Duas title, caption and subtitle in Arabic', async () => {
    const view = await renderUi(<MenuDuasCard onPress={jest.fn()} />);

    expect(view.getByText('الأدعية')).toBeOnTheScreen();
    expect(view.getByText('الدعاء')).toBeOnTheScreen();
    expect(view.getByText('من القرآن والسنة وأدعيتك')).toBeOnTheScreen();
  });

  it('opens Duas when pressed', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<MenuDuasCard onPress={onPress} testID="card" />);

    fireEvent.press(view.getByTestId('card'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders in English', async () => {
    const view = await renderUi(<MenuDuasCard onPress={jest.fn()} />, { locale: 'en' });

    expect(view.getByText('Duas')).toBeOnTheScreen();
    expect(view.getByText('Supplication')).toBeOnTheScreen();
    expect(view.getByText('Quran, Sunnah and yours')).toBeOnTheScreen();
  });

  it('uses i18n only for visible strings', () => {
    expect(featureComponentLiterals('features/duas/components/MenuDuasCard.tsx')).toEqual([]);
  });
});
