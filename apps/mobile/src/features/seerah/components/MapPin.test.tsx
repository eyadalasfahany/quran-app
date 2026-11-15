import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { themes } from '@/core/theme';

import { MapPin } from './MapPin';

const hidden = { includeHiddenElements: true } as const;

describe('MapPin', () => {
  it.each(locales)('renders a button with its label (%s)', async (locale) => {
    await renderUi(<MapPin label="Pin label" onPress={jest.fn()} />, { locale });
    expect(screen.getByRole('button', { name: 'Pin label' })).toBeOnTheScreen();
  });

  it('calls onPress', async () => {
    const onPress = jest.fn();
    await renderUi(<MapPin label="x" onPress={onPress} />);
    await press(screen.getByRole('button', { name: 'x' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is a 44 pt target', async () => {
    await renderUi(<MapPin label="x" onPress={jest.fn()} testID="pin" />);
    expect(flatStyle(screen.getByTestId('pin', hidden).props.style)).toMatchObject({ height: 44, width: 44 });
  });

  it('draws a solid brand dot, and a hollow ring for a landmark with no events', async () => {
    const solid = await renderUi(<MapPin label="x" onPress={jest.fn()} testID="pin" />);
    expect(flatStyle(screen.getByTestId('pin-dot').props.style).backgroundColor).toBe(themes.light.colors.brand);
    await solid.unmount();
    await renderUi(<MapPin label="x" onPress={jest.fn()} testID="pin" variant="empty" />);
    expect(flatStyle(screen.getByTestId('pin-dot').props.style)).toMatchObject({
      backgroundColor: themes.light.colors.surfaceRaised,
      height: 9,
    });
  });

  it('draws the single dot as a 14 pt circle in a 3 pt raised ring, never a rounded square', async () => {
    await renderUi(<MapPin label="x" onPress={jest.fn()} testID="pin" />);
    const dot = flatStyle(screen.getByTestId('pin-dot').props.style);
    expect(dot).toMatchObject({ borderWidth: 3, height: 20, width: 20 });
    expect(dot.borderRadius).toBe(10);
  });

  it('draws the dashed gold edge only when uncertain', async () => {
    const plain = await renderUi(<MapPin label="x" onPress={jest.fn()} testID="pin" />);
    expect(screen.queryByTestId('pin-uncertain')).toBeNull();
    await plain.unmount();
    await renderUi(<MapPin label="x" onPress={jest.fn()} testID="pin" uncertain />);
    expect(flatStyle(screen.getByTestId('pin-uncertain').props.style)).toMatchObject({
      borderColor: themes.light.colors.gold,
      borderStyle: 'dashed',
    });
  });

  it('shows the halo when selected', async () => {
    await renderUi(<MapPin label="x" onPress={jest.fn()} selected testID="pin" />);
    expect(screen.getByTestId('pin-halo')).toBeOnTheScreen();
  });

  it('a dimmed pin fades and leaves the accessibility order', async () => {
    await renderUi(<MapPin dimmed label="x" onPress={jest.fn()} testID="pin" />);
    const pin = screen.getByTestId('pin', hidden);
    expect(pin.props.accessibilityElementsHidden).toBe(true);
    expect(pin.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(flatStyle(pin.props.style).opacity).toBe(themes.light.opacity.disabled);
    expect(screen.queryByRole('button', { name: 'x' })).toBeNull();
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/MapPin.tsx')).toEqual([]);
  });
});
