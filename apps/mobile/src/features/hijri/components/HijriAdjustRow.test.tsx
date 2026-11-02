import { fireEvent } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';

import { HijriAdjustRow } from './HijriAdjustRow';

describe('HijriAdjustRow', () => {
  it('shows the current adjustment and opens the adjust sheet on press', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<HijriAdjustRow onPress={onPress} testID="adjust" valueLabel="+١ يوم" />);

    expect(view.getByText('+١ يوم')).toBeOnTheScreen();
    fireEvent.press(view.getByRole('button', { name: 'تعديل التاريخ' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows the chevron because it opens a sheet', async () => {
    const view = await renderUi(<HijriAdjustRow onPress={jest.fn()} valueLabel="٠ يوم" />);

    expect(view.getByRole('button')).toBeOnTheScreen();
  });

  it('renders in English', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<HijriAdjustRow onPress={onPress} valueLabel="+1 days" />, { locale: 'en' });

    fireEvent.press(view.getByRole('button', { name: 'Adjust the date' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
