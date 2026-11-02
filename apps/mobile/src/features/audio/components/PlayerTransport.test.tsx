import { cleanup, fireEvent } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import { I18nManager } from 'react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { themes } from '@/core/theme';
import { initialPlayerState, usePlayerStore } from '../playerStore';

import { PlayerTransport } from './PlayerTransport';

jest.mock('expo-symbols', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SymbolView: (props: { name: unknown }) => createElement(View, { symbolName: props.name } as ComponentProps<typeof View>) };
});

const hidden = { includeHiddenElements: true };
const colors = themes.dark.colors;

async function renderTransport(props: Partial<ComponentProps<typeof PlayerTransport>> = {}, locale: 'ar' | 'en' = 'ar') {
  const handlers = { onPrevious: jest.fn(), onNext: jest.fn(), onTogglePlay: jest.fn() };
  const view = await renderUi(<PlayerTransport isPlaying={false} stepsEnabled={false} {...handlers} {...props} />, {
    locale,
    theme: 'dark',
  });
  return { handlers, view };
}

describe('PlayerTransport', () => {
  beforeEach(() => {
    usePlayerStore.setState({ ...initialPlayerState });
  });

  afterEach(() => {
    cleanup();
    I18nManager.isRTL = false;
  });

  it('shows the play button when paused, and the pause button when playing', async () => {
    const paused = (await renderTransport({ isPlaying: false })).view;
    expect(paused.getByRole('button', { name: 'تشغيل' })).toBeOnTheScreen();
    expect(paused.getByTestId('player-toggle-icon', hidden).props.symbolName).toBeUndefined();

    const playing = (await renderTransport({ isPlaying: true })).view;
    expect(playing.getByRole('button', { name: 'إيقاف مؤقت' })).toBeOnTheScreen();
  });

  it('disables previous and next ayah until steps are available, and keeps play/pause enabled', async () => {
    const view = (await renderTransport({ stepsEnabled: false })).view;

    expect(view.getByRole('button', { name: 'الآية السابقة' })).toBeDisabled();
    expect(view.getByRole('button', { name: 'الآية التالية' })).toBeDisabled();
    expect(view.getByRole('button', { name: 'تشغيل' })).toBeEnabled();
  });

  it('draws the play button in the gold fill with the player background glyph, at 76 pt', async () => {
    const view = (await renderTransport()).view;
    const toggle = view.getByRole('button', { name: 'تشغيل' });

    expect(flatStyle(toggle.props.style)).toMatchObject({ backgroundColor: colors.goldOnBrandSurface, height: 76, width: 76 });
    expect(flatStyle(toggle.props.style).borderRadius).toBe(38);
  });

  it.each(locales)('keeps the physical order previous, toggle, next in the row for %s, and lets RTL mirror it', async (locale) => {
    I18nManager.isRTL = locale === 'ar';
    const view = (await renderTransport({}, locale)).view;
    const order = view.getByTestId('player-transport').children
      .map((child) => (typeof child === 'string' ? undefined : child.props.testID))
      .filter((id): id is string => typeof id === 'string');

    // The JSX order is the reading order. RN's row flips it in Arabic, so the tree never forces a physical order.
    expect(order).toEqual(['player-previous', 'player-toggle', 'player-next']);
    expect(flatStyle(view.getByTestId('player-transport').props.style).flexDirection).toBe('row');
  });

  it('flips the step glyphs in RTL and keeps the play triangle unflipped', async () => {
    const ar = (await renderTransport({ stepsEnabled: true }, 'ar')).view;
    I18nManager.isRTL = true;
    expect(flatStyle(ar.getByTestId('player-previous-icon', hidden).props.style).transform).toEqual([{ scaleX: -1 }]);
    expect(flatStyle(ar.getByTestId('player-next-icon', hidden).props.style).transform).toEqual([{ scaleX: -1 }]);
    // Play maps to the timeline, not the reading direction, so it never flips.
    expect(flatStyle(ar.getByTestId('player-toggle-icon', hidden).props.style).transform).toBeUndefined();

    I18nManager.isRTL = false;
    const en = (await renderTransport({ stepsEnabled: true }, 'en')).view;
    expect(flatStyle(en.getByTestId('player-previous-icon', hidden).props.style).transform).toBeUndefined();
    expect(flatStyle(en.getByTestId('player-toggle-icon', hidden).props.style).transform).toBeUndefined();
  });

  it('calls the right handler for each button', async () => {
    const { handlers, view: awaited } = await renderTransport({ stepsEnabled: true });

    fireEvent.press(awaited.getByRole('button', { name: 'الآية السابقة' }));
    fireEvent.press(awaited.getByRole('button', { name: 'تشغيل' }));
    fireEvent.press(awaited.getByRole('button', { name: 'الآية التالية' }));

    expect(handlers.onPrevious).toHaveBeenCalledTimes(1);
    expect(handlers.onTogglePlay).toHaveBeenCalledTimes(1);
    expect(handlers.onNext).toHaveBeenCalledTimes(1);
  });

  it('draws no buffering ring when nothing is starting', async () => {
    usePlayerStore.setState({ ...initialPlayerState });
    const { view } = await renderTransport();

    expect(view.queryByTestId('player-toggle-ring', hidden)).toBeNull();
  });

  it('shows the pause glyph and the buffering ring from any start, and ignores a second tap on play', async () => {
    usePlayerStore.setState({ ...initialPlayerState, startingTarget: { kind: 'reciter', resourceId: 30 } });
    const { view, handlers } = await renderTransport({ isPlaying: false });

    expect(await view.findByTestId('player-toggle-ring', hidden)).toBeTruthy();
    expect(view.getByRole('button', { name: 'إيقاف مؤقت' }).props.accessibilityState).toEqual({ busy: true, disabled: false });
    await fireEvent.press(view.getByRole('button', { name: 'إيقاف مؤقت' }));

    expect(handlers.onTogglePlay).not.toHaveBeenCalled();
  });

  it('uses no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/audio/components/PlayerTransport.tsx')).toEqual([]);
  });
});
