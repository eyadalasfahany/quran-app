import type { ComponentProps } from 'react';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { themes } from '@/core/theme';

import { PlayerReciterStyleTag } from './PlayerReciterStyleTag';

jest.mock('expo-symbols', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SymbolView: () => createElement(View, {} as ComponentProps<typeof View>) };
});

const colors = themes.dark.colors;

describe('PlayerReciterStyleTag', () => {
  it.each(locales)('shows the style label as a gold pill with a hairline, in %s', async (locale) => {
    const view = await renderUi(<PlayerReciterStyleTag label="مرتّل" testID="tag" />, { locale, theme: 'dark' });

    expect(flatStyle(view.getByTestId('tag').props.style)).toMatchObject({
      borderColor: colors.playerLine,
      borderRadius: 10,
      borderWidth: 1,
    });
    expect(flatStyle(view.getByText('مرتّل').props.style).color).toBe(colors.playerAccent);
  });

  it('renders the label it is given, in English', async () => {
    const view = await renderUi(<PlayerReciterStyleTag label="Murattal" />, { locale: 'en', theme: 'dark' });

    expect(view.getByText('Murattal')).toBeOnTheScreen();
  });

  it('uses no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/audio/components/PlayerReciterStyleTag.tsx')).toEqual([]);
  });
});
