import { fireEvent } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { IconButton, ICON_BUTTON_SIZE } from './IconButton';

const mockLiquidGlass = jest.fn(() => false);

jest.mock('expo-glass-effect', () => ({
  ...jest.requireActual('expo-glass-effect'),
  isLiquidGlassAvailable: () => mockLiquidGlass(),
}));

const bookmark = { ios: 'bookmark', android: 'bookmark' } as const;
const back = { ios: 'chevron.right', android: 'chevron_right' } as const;
const colors = themes.light.colors;

describe('IconButton', () => {
  beforeEach(() => {
    mockLiquidGlass.mockReturnValue(false);
    jest.mocked(AccessibilityInfo.isReduceTransparencyEnabled).mockResolvedValue(false);
  });

  it('renders a 44 pt plain button with its label', async () => {
    const view = await renderUi(<IconButton icon={bookmark} label="حفظ الصفحة" onPress={() => undefined} />);
    const button = view.getByRole('button', { name: 'حفظ الصفحة' });

    expect(flatStyle(button.props.style)).toMatchObject({
      backgroundColor: 'transparent',
      height: ICON_BUTTON_SIZE,
      width: ICON_BUTTON_SIZE,
    });
    expect(ICON_BUTTON_SIZE).toBeGreaterThanOrEqual(44);
    expect(button.props.accessibilityState?.selected).toBeUndefined();
  });

  it('fills the filled variant with fillSecondary', async () => {
    const view = await renderUi(<IconButton icon={bookmark} label="Close" onPress={() => undefined} variant="filled" />);

    expect(flatStyle(view.getByRole('button').props.style).backgroundColor).toBe(colors.fillSecondary);
  });

  it('puts the glass variant on a glass surface, solid when glass is unavailable', async () => {
    const view = await renderUi(
      <IconButton icon={back} label="Back" onPress={() => undefined} testID="back" variant="glass" />,
    );

    const layer = view.getByTestId('back-glass');
    const [surface] = layer.children;

    expect(flatStyle(typeof surface === 'object' ? surface.props.style : undefined)).toMatchObject({
      backgroundColor: colors.glassFallback,
    });
  });

  it('draws the glass inside the button, where it never takes the touch', async () => {
    const onPress = jest.fn();
    const view = await renderUi(
      <IconButton icon={back} label="Back" onPress={onPress} testID="back" variant="glass" />,
    );

    expect(view.getByTestId('back-glass').props.pointerEvents).toBe('none');
    expect(view.getByTestId('back')).toContainElement(view.getByTestId('back-glass'));
    await fireEvent.press(view.getByTestId('back'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('marks a toggled-on button as selected and tints it brand', async () => {
    const view = await renderUi(<IconButton icon={bookmark} label="Bookmark" onPress={() => undefined} pressed />);
    const button = view.getByRole('button', { name: 'Bookmark' });

    expect(button.props.accessibilityState).toMatchObject({ selected: true });
    expect(flatStyle(button.props.style).backgroundColor).toBe(colors.glassSelected);
  });

  it('reports selected false when the toggle is off', async () => {
    const view = await renderUi(
      <IconButton icon={bookmark} label="Bookmark" onPress={() => undefined} pressed={false} />,
    );

    expect(view.getByRole('button').props.accessibilityState).toMatchObject({ selected: false });
  });

  it('calls onPress', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<IconButton icon={bookmark} label="Bookmark" onPress={onPress} />);

    await fireEvent.press(view.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('mirrors a directional glyph only in RTL (%s)', async (locale) => {
    const view = await renderUi(
      <IconButton icon={back} label="Back" mirrorInRtl onPress={() => undefined} testID="back" />,
      { locale },
    );
    const [icon] = view.getByTestId('back').children;

    expect(typeof icon).toBe('object');
    expect(flatStyle(typeof icon === 'object' ? icon.props.style : undefined).transform).toEqual(
      locale === 'ar' ? [{ scaleX: -1 }] : undefined,
    );
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('IconButton.tsx')).toEqual([]);
  });
});
