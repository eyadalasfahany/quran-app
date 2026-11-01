import { screen } from '@testing-library/react-native';

import { press } from '../../../../jest/azkar-ui-fixtures';
import { flatStyle, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { AzkarTopicTile } from './AzkarTopicTile';

describe('AzkarTopicTile', () => {
  it('shows the title over its count, as one labelled button', async () => {
    await renderUi(<AzkarTopicTile countText="١٢ ذكرًا" onPress={jest.fn()} title="الحماية" />);

    expect(screen.getByText('الحماية')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'الحماية, ١٢ ذكرًا' })).toBeOnTheScreen();
  });

  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    await renderUi(<AzkarTopicTile countText="5 dhikr" onPress={onPress} title="Travel" />, { locale: 'en' });

    await press(screen.getByRole('button', { name: 'Travel, 5 dhikr' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('keeps a touch target of at least 44 pt tall', async () => {
    const view = await renderUi(<AzkarTopicTile countText="٨ أذكار" onPress={jest.fn()} title="المغفرة والتوبة" />);
    expect(flatStyle(screen.getByTestId('azkar-topic-tile').props.style).minHeight).toBeGreaterThanOrEqual(44);
    expect(view).toBeTruthy();
  });

  it('renders the English labels', async () => {
    await renderUi(<AzkarTopicTile countText="8 dhikr" onPress={jest.fn()} title="Food" />, { locale: 'en' });
    expect(screen.getByRole('button', { name: 'Food, 8 dhikr' })).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/azkar/components/AzkarTopicTile.tsx')).toEqual([]);
  });
});
