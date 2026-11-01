import { fireEvent } from '@testing-library/react-native';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, renderUi } from '../../../../jest/render-ui';
import { SelectedAzkarCard } from './SelectedAzkarCard';

describe('SelectedAzkarCard', () => {
  it('shows the session name and its count', async () => {
    const view = await renderUi(<SelectedAzkarCard fraction={0.5} onPress={jest.fn()} progressText="١٢ من ٢٤" title="أذكار الصباح" />);

    expect(view.getByText('أذكار الصباح')).toBeOnTheScreen();
    expect(view.getByText('١٢ من ٢٤')).toBeOnTheScreen();
  });

  it('draws the bar to the share done, and clamps it to the card', async () => {
    const half = await renderUi(<SelectedAzkarCard fraction={0.5} onPress={jest.fn()} progressText="x" title="x" />);
    expect(flatStyle(half.getByTestId('home-selected-azkar-card-progress').props.style).width).toBe('50%');

    const over = await renderUi(<SelectedAzkarCard fraction={4} onPress={jest.fn()} progressText="x" title="x" />);
    expect(flatStyle(over.getByTestId('home-selected-azkar-card-progress').props.style).width).toBe('100%');
  });

  it('opens its session on press, with the count in its label', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<SelectedAzkarCard fraction={0} onPress={onPress} progressText="٠ من ٩" title="أذكار النوم" />);

    await fireEvent.press(view.getByRole('button', { name: 'أذكار النوم, ٠ من ٩' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/home/components/SelectedAzkarCard.tsx')).toEqual([]);
  });
});
