import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { themes } from '@/core/theme';

import { ClusterPin } from './ClusterPin';

const hidden = { includeHiddenElements: true } as const;

describe('ClusterPin', () => {
  it.each(locales)('shows the count and the label (%s)', async (locale) => {
    await renderUi(<ClusterPin count={7} label="Seven here" onPress={jest.fn()} />, { locale });
    expect(screen.getByRole('button', { name: 'Seven here' })).toBeOnTheScreen();
    expect(screen.getByText(locale === 'ar' ? '٧' : '7', hidden)).toBeOnTheScreen();
  });

  it('calls onPress', async () => {
    const onPress = jest.fn();
    await renderUi(<ClusterPin count={7} label="x" onPress={onPress} />);
    await press(screen.getByRole('button', { name: 'x' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('draws the gold ring for a city only', async () => {
    const plain = await renderUi(<ClusterPin count={7} label="x" onPress={jest.fn()} testID="pin" />);
    expect(screen.queryByTestId('pin-ring')).toBeNull();
    await plain.unmount();
    await renderUi(<ClusterPin count={56} label="x" onPress={jest.fn()} testID="pin" variant="city" />);
    expect(flatStyle(screen.getByTestId('pin-ring').props.style).borderColor).toBe(themes.light.colors.gold);
  });

  it('is a 44 pt target and shows the halo when selected', async () => {
    await renderUi(<ClusterPin count={2} label="x" onPress={jest.fn()} selected testID="pin" />);
    expect(flatStyle(screen.getByTestId('pin').props.style)).toMatchObject({ height: 44, width: 44 });
    expect(screen.getByTestId('pin-halo')).toBeOnTheScreen();
  });

  it('a dimmed cluster leaves the accessibility order', async () => {
    await renderUi(<ClusterPin count={2} dimmed label="x" onPress={jest.fn()} />);
    expect(screen.queryByRole('button', { name: 'x' })).toBeNull();
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/ClusterPin.tsx')).toEqual([]);
  });
});
