import { fireEvent } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import { I18nManager } from 'react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { themes } from '@/core/theme';

import { PlayerIconButton } from './PlayerIconButton';

jest.mock('expo-symbols', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    SymbolView: (props: { tintColor: string }) =>
      createElement(View, { testID: 'symbol', tintColor: props.tintColor } as ComponentProps<typeof View>),
  };
});

const chevron = { ios: 'chevron.down', android: 'expand_more' } as const;
const next = { ios: 'forward.end.fill', android: 'skip_next' } as const;
const dark = themes.dark.colors;
// Icons are decorative and hidden from accessibility; the tests still reach them.
const hidden = { includeHiddenElements: true };

describe('PlayerIconButton', () => {
  afterEach(() => {
    I18nManager.isRTL = false;
  });

  it('renders a 44 pt transparent button with its label and the player ink glyph', async () => {
    const view = await renderUi(<PlayerIconButton icon={chevron} label="تصغير المشغّل" onPress={() => undefined} testID="min" />, {
      theme: 'dark',
    });
    const button = view.getByRole('button', { name: 'تصغير المشغّل' });

    expect(flatStyle(button.props.style)).toMatchObject({ backgroundColor: 'transparent', height: 44, width: 44 });
    expect(view.getByTestId('symbol', hidden).props.tintColor).toBe(dark.playerInk);
  });

  it('never makes the hit area smaller than 44 pt, even when asked', async () => {
    const view = await renderUi(<PlayerIconButton hitSize={20} icon={chevron} label="Small" onPress={() => undefined} />);

    expect(flatStyle(view.getByRole('button').props.style)).toMatchObject({ height: 44, width: 44 });
  });

  it('fills with the background token and draws the glyph in the given colour', async () => {
    const view = await renderUi(
      <PlayerIconButton background={dark.goldOnBrandSurface} glyphColor={dark.playerBg} icon={next} label="تشغيل" onPress={() => undefined} />,
      { theme: 'dark' },
    );

    expect(flatStyle(view.getByRole('button').props.style).backgroundColor).toBe(dark.goldOnBrandSurface);
    expect(view.getByTestId('symbol', hidden).props.tintColor).toBe(dark.playerBg);
  });

  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<PlayerIconButton icon={chevron} label="تصغير المشغّل" onPress={onPress} />);

    fireEvent.press(view.getByRole('button', { name: 'تصغير المشغّل' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress and reports disabled when disabled', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<PlayerIconButton disabled icon={chevron} label="الآية السابقة" onPress={onPress} />);
    const button = view.getByRole('button', { name: 'الآية السابقة' });

    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(button.props.accessibilityState).toMatchObject({ disabled: true });
  });

  it.each(locales)('mirrors a directional glyph in RTL only, and never a play glyph (%s)', async (locale) => {
    const view = await renderUi(
      <>
        <PlayerIconButton icon={next} label="next" mirrorInRtl onPress={() => undefined} testID="dir" />
        <PlayerIconButton icon={{ ios: 'play.fill', android: 'play_arrow' }} label="play" onPress={() => undefined} testID="play" />
      </>,
      { locale },
    );
    I18nManager.isRTL = locale === 'ar';
    const directional = flatStyle(view.getByTestId('dir-icon', hidden).props.style);
    const play = flatStyle(view.getByTestId('play-icon', hidden).props.style);

    expect(directional.transform).toEqual(locale === 'ar' ? [{ scaleX: -1 }] : undefined);
    expect(play.transform).toBeUndefined();
  });

  it('uses no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/audio/components/PlayerIconButton.tsx')).toEqual([]);
  });
});
