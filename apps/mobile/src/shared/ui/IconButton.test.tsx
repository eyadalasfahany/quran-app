import { fireEvent } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import { AccessibilityInfo } from 'react-native';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { IconButton, ICON_BUTTON_SIZE } from './IconButton';

jest.mock('expo-symbols', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    SymbolView: (props: { tintColor: string }) =>
      createElement(View, { testID: 'symbol', tintColor: props.tintColor } as ComponentProps<typeof View>),
  };
});

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

  it('fills the surface variant with the surface token, as the side panel close does', async () => {
    const view = await renderUi(<IconButton icon={{ ios: 'xmark', android: 'close' }} label="Close" onPress={() => undefined} variant="surface" />);

    expect(flatStyle(view.getByRole('button').props.style).backgroundColor).toBe(themes.light.colors.surface);
  });

  it('fills the track variant with fillTrack, at the same 44 pt size and radius as filled', async () => {
    const view = await renderUi(<IconButton icon={bookmark} label="Close" onPress={() => undefined} variant="track" />);
    const filled = await renderUi(<IconButton icon={bookmark} label="Close" onPress={() => undefined} variant="filled" />);

    expect(flatStyle(view.getByRole('button').props.style)).toMatchObject({
      backgroundColor: colors.fillTrack,
      borderRadius: themes.light.radius.pill,
      height: ICON_BUTTON_SIZE,
      width: ICON_BUTTON_SIZE,
    });
    expect(flatStyle(filled.getByRole('button').props.style)).toMatchObject({
      borderRadius: themes.light.radius.pill,
      height: ICON_BUTTON_SIZE,
      width: ICON_BUTTON_SIZE,
    });
  });

  it('draws the raised variant as a surfaceRaised disc with a hairline, at 44 pt', async () => {
    const view = await renderUi(<IconButton icon={bookmark} label="بحث" onPress={() => undefined} variant="raised" />);

    expect(flatStyle(view.getByRole('button').props.style)).toMatchObject({
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.line,
      borderRadius: themes.light.radius.pill,
      borderWidth: themes.light.stroke.hairline,
      height: ICON_BUTTON_SIZE,
      width: ICON_BUTTON_SIZE,
    });
  });

  it('draws no border on the plain variant', async () => {
    const view = await renderUi(<IconButton icon={bookmark} label="Plain" onPress={() => undefined} />);

    expect(flatStyle(view.getByRole('button').props.style).borderWidth).toBe(0);
  });

  it('shows the pressed glass tint on the track variant when toggled on', async () => {
    const view = await renderUi(
      <IconButton icon={bookmark} label="Bookmark" onPress={() => undefined} pressed variant="track" />,
    );

    expect(flatStyle(view.getByRole('button').props.style).backgroundColor).toBe(colors.glassSelected);
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

  it('draws the glyph at the 22 pt default unless an icon size is given', async () => {
    const view = await renderUi(<IconButton icon={bookmark} label="Bookmark" onPress={() => undefined} testID="bm" />);

    expect(flatStyle(view.getByTestId('bm-icon', { includeHiddenElements: true }).props.style)).toMatchObject({
      height: 22,
      width: 22,
    });
  });

  it('draws the glyph at the iconSize it is given', async () => {
    const view = await renderUi(
      <IconButton icon={bookmark} iconSize={12} label="Close" onPress={() => undefined} testID="close" />,
    );

    expect(flatStyle(view.getByTestId('close-icon', { includeHiddenElements: true }).props.style)).toMatchObject({
      height: 12,
      width: 12,
    });
  });

  it('draws a muted glyph in ink-muted, and keeps the ink glyph by default', async () => {
    const muted = await renderUi(
      <IconButton icon={bookmark} label="Muted" onPress={() => undefined} testID="muted" tone="muted" />,
    );
    const ink = await renderUi(<IconButton icon={bookmark} label="Ink" onPress={() => undefined} testID="ink" />);

    expect(JSON.stringify(muted.toJSON())).toContain(colors.inkMuted);
    expect(JSON.stringify(ink.toJSON())).toContain(colors.ink);
  });

  it('disables the press and fades the button when disabled', async () => {
    const onPress = jest.fn();
    const view = await renderUi(
      <IconButton disabled icon={bookmark} label="Play" onPress={onPress} testID="play" />,
    );
    const button = view.getByRole('button', { name: 'Play' });

    expect(button.props.accessibilityState).toMatchObject({ disabled: true });
    expect(flatStyle(button.props.style).opacity).toBe(themes.light.opacity.disabled);
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('exposes the hint for screen readers when given one', async () => {
    const view = await renderUi(
      <IconButton disabled hint="Recitation isn't available yet" icon={bookmark} label="Play" onPress={() => undefined} />,
    );

    expect(view.getByRole('button', { name: 'Play' }).props.accessibilityHint).toBe("Recitation isn't available yet");
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('IconButton.tsx')).toEqual([]);
  });
});
