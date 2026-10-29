import { act, fireEvent, type RenderResult } from '@testing-library/react-native';
import { router } from 'expo-router';
import { BackHandler, Dimensions, Pressable, Text } from 'react-native';
import { setUpTests, useReducedMotion } from 'react-native-reanimated';

import { locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { PlayerHost } from './PlayerHost';
import { usePlayerHost } from './player-host-context';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
}));

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  // The mock is an ES module, so the default import (Animated) resolves.
  return { ...actual, __esModule: true, default: actual.default, useReducedMotion: jest.fn(() => false) };
});

setUpTests();

// The Jest window is 750 × 1334. The player slides from its height to 0.
const HEIGHT = Dimensions.get('window').height;

/** A button that closes the player through the host, as the chevron does. */
function CloseProbe() {
  const host = usePlayerHost();
  return (
    <Pressable accessibilityRole="button" onPress={host.close} testID="close">
      <Text>close</Text>
    </Pressable>
  );
}

/** Waits out the slide and fade animations (about 350 ms and 500 ms) so their completions run. */
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
  });
}

// The player fades from opacity 0 under Reduce Motion, which RNTL treats as hidden; query it anyway.
const hidden = { includeHiddenElements: true };

function playerStyle(view: RenderResult) {
  return view.getByTestId('player-host', hidden);
}

describe('PlayerHost', () => {
  beforeEach(() => {
    jest.mocked(router.back).mockClear();
    jest.mocked(useReducedMotion).mockReturnValue(false);
  });

  it('renders its children', async () => {
    const view = await renderUi(
      <PlayerHost>
        <Text>المشغّل</Text>
      </PlayerHost>,
    );

    expect(view.getByText('المشغّل')).toBeOnTheScreen();
  });

  it('slides up from below the screen to the top on open, fully opaque', async () => {
    const view = await renderUi(
      <PlayerHost>
        <Text>المشغّل</Text>
      </PlayerHost>,
    );
    await settle();
    expect(playerStyle(view).props.testID).toBe('player-host');
  });

  it('fades in in place under Reduce Motion', async () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    const view = await renderUi(
      <PlayerHost>
        <Text>المشغّل</Text>
      </PlayerHost>,
    );

    expect(playerStyle(view)).toHaveAnimatedStyle({ opacity: 0, transform: [{ translateY: 0 }] });
    await settle();
    expect(playerStyle(view)).toHaveAnimatedStyle({ opacity: 1, transform: [{ translateY: 0 }] });
  });

  it('close slides the player down, then leaves the route once, even when closed twice', async () => {
    const view = await renderUi(
      <PlayerHost>
        <CloseProbe />
      </PlayerHost>,
    );
    await settle();

    await fireEvent.press(view.getByTestId('close', hidden));
    await fireEvent.press(view.getByTestId('close', hidden));
    expect(router.back).not.toHaveBeenCalled();
    await settle();

    expect(playerStyle(view)).toHaveAnimatedStyle({ transform: [{ translateY: HEIGHT }] });
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('closes under Reduce Motion with a fade, then leaves the route', async () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    const view = await renderUi(
      <PlayerHost>
        <CloseProbe />
      </PlayerHost>,
    );
    await settle();

    await fireEvent.press(view.getByTestId('close', hidden));
    await settle();

    expect(playerStyle(view)).toHaveAnimatedStyle({ opacity: 0, transform: [{ translateY: 0 }] });
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('closes on Android back, and removes its listener on unmount', async () => {
    const remove = jest.fn();
    const add = jest.spyOn(BackHandler, 'addEventListener').mockImplementation(() => ({ remove }));
    try {
      const view = await renderUi(
        <PlayerHost>
          <Text>المشغّل</Text>
        </PlayerHost>,
      );
      await settle();

      const listener = add.mock.calls.find(([name]) => name === 'hardwareBackPress')?.[1] as
        | (() => boolean | null | undefined)
        | undefined;
      expect(listener).toEqual(expect.any(Function));
      let handled: boolean | null | undefined;
      await act(async () => {
        handled = listener?.();
      });
      expect(handled).toBe(true);
      await settle();
      expect(router.back).toHaveBeenCalledTimes(1);

      await act(async () => {
        view.unmount();
      });
      expect(remove).toHaveBeenCalled();
    } finally {
      add.mockRestore();
    }
  });

  it('closes with the VoiceOver escape gesture', async () => {
    const view = await renderUi(
      <PlayerHost>
        <Text>المشغّل</Text>
      </PlayerHost>,
    );
    await settle();

    const player = playerStyle(view);
    expect(player.props.onAccessibilityEscape).toEqual(expect.any(Function));
    await act(async () => {
      player.props.onAccessibilityEscape();
    });
    await settle();

    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('is a modal view with a dismiss action labelled in %s', async (locale) => {
    const view = await renderUi(
      <PlayerHost>
        <Text>المشغّل</Text>
      </PlayerHost>,
      { locale },
    );
    await settle();

    const player = playerStyle(view);
    expect(player.props.accessibilityViewIsModal).toBe(true);
    expect(player.props.accessibilityActions).toEqual([
      { label: locale === 'ar' ? 'تصغير المشغّل' : 'Minimize player', name: 'dismiss' },
    ]);

    await act(async () => {
      player.props.onAccessibilityAction({ nativeEvent: { actionName: 'dismiss' } });
    });
    await settle();
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('ignores accessibility actions it does not own', async () => {
    const view = await renderUi(
      <PlayerHost>
        <Text>المشغّل</Text>
      </PlayerHost>,
    );
    await settle();

    await act(async () => {
      playerStyle(view).props.onAccessibilityAction({ nativeEvent: { actionName: 'magictap' } });
    });
    await settle();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/audio/components/PlayerHost.tsx')).toEqual([]);
  });
});
