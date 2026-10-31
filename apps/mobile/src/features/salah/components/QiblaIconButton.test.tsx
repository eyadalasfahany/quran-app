import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { themes } from '@/core/theme';

import { QiblaIconButton } from './QiblaIconButton';

const colors = themes.light.colors;
const ICON = { ios: 'chevron.backward', android: 'arrow_back' } as const;

describe('QiblaIconButton', () => {
  it('renders a 44 pt glass circle with a player-ink glyph', async () => {
    const view = await renderUi(<QiblaIconButton icon={ICON} label="رجوع" onPress={jest.fn()} testID="back" />);

    expect(flatStyle(view.getByTestId('back').props.style)).toMatchObject({
      backgroundColor: colors.playerGlassFill,
      borderColor: colors.playerGlassStroke,
      borderRadius: themes.light.radius.pill,
      height: themes.light.size.touchTarget,
      width: themes.light.size.touchTarget,
    });
  });

  it('is a labelled button and calls onPress', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<QiblaIconButton icon={ICON} label="رجوع" onPress={onPress} />);

    await fireEvent.press(view.getByRole('button', { name: 'رجوع' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled, and dims', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<QiblaIconButton disabled icon={ICON} label="رجوع" onPress={onPress} testID="back" />);

    const button = view.getByRole('button', { name: 'رجوع' });
    expect(button).toBeDisabled();
    expect(flatStyle(view.getByTestId('back').props.style).opacity).toBe(themes.light.opacity.disabled);

    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it.each(locales)('keeps its touch target in %s', async (locale) => {
    const view = await renderUi(<QiblaIconButton icon={ICON} label="back" onPress={jest.fn()} testID="back" />, {
      locale,
    });

    expect(flatStyle(view.getByTestId('back').props.style).width).toBe(themes.light.size.touchTarget);
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/salah/components/QiblaIconButton.tsx')).toEqual([]);
  });
});
