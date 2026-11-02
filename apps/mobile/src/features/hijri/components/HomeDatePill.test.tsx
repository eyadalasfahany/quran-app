import { fireEvent } from '@testing-library/react-native';

import { flatStyle, renderUi } from '../../../../jest/render-ui';
import { themes } from '@/core/theme';

import { HomeDatePill } from './HomeDatePill';

describe('HomeDatePill', () => {
  it('shows the date and opens the calendar on press', async () => {
    const onPress = jest.fn();
    const view = await renderUi(
      <HomeDatePill label="التقويم الهجري: ٢٢ جمادى الأولى ١٤٤٨" onPress={onPress} text="٢٢ جمادى الأولى ١٤٤٨" />,
    );

    expect(view.getByText('٢٢ جمادى الأولى ١٤٤٨')).toBeOnTheScreen();
    fireEvent.press(view.getByRole('button', { name: 'التقويم الهجري: ٢٢ جمادى الأولى ١٤٤٨' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is a 36 pt or taller fillSecondary pill, not a raw colour', async () => {
    const view = await renderUi(<HomeDatePill label="label" onPress={jest.fn()} testID="pill" text="date" />);
    const style = flatStyle(view.getByTestId('pill').props.style);

    expect(style.backgroundColor).toBe(themes.light.colors.fillSecondary);
    expect(style.minHeight).toBeGreaterThanOrEqual(36);
  });

  it('keeps the same label and press in English', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<HomeDatePill label="Hijri calendar: 22 Jumada I 1448" onPress={onPress} text="22 Jumada I 1448" />, {
      locale: 'en',
    });

    fireEvent.press(view.getByRole('button', { name: 'Hijri calendar: 22 Jumada I 1448' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
