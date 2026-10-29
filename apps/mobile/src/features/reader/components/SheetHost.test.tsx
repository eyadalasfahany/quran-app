import { act, fireEvent, type RenderResult } from '@testing-library/react-native';
import { router } from 'expo-router';
import { BackHandler, Dimensions, Pressable, Text } from 'react-native';
import { setUpTests, useReducedMotion } from 'react-native-reanimated';

import { themes } from '@/core/theme';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { SheetHost } from './SheetHost';
import { useSheet } from './sheet-context';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 34, left: 0, right: 0, top: 47 }) };
});

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  // The mock is an ES module, so the default import (Animated) resolves.
  return { ...actual, __esModule: true, default: actual.default, useReducedMotion: jest.fn(() => false) };
});

setUpTests();

// The Jest window is 750 × 1334 with a 47 pt safe area above: full is 55, mid is half the window, closed is the bottom edge.
const WINDOW_HEIGHT = Dimensions.get('window').height;
const MID = WINDOW_HEIGHT * 0.5;
const FULL = 47 + 8;
const CLOSED = WINDOW_HEIGHT;

/** Shows the detent the sheet reports and offers buttons that move it. */
function DetentProbe() {
  const sheet = useSheet();
  return (
    <>
      <Text testID="detent">{sheet?.detent ?? 'none'}</Text>
      <Pressable accessibilityRole="button" onPress={() => sheet?.expand()} testID="expand">
        <Text>expand</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => sheet?.collapse()} testID="collapse">
        <Text>collapse</Text>
      </Pressable>
    </>
  );
}

/** Runs the card and scrim animations to their end, then lets their completions run. */
async function settle() {
  await act(async () => {
    jest.advanceTimersByTime(3000);
  });
}

function detentOf(view: RenderResult) {
  return view.getByTestId('detent').props.children;
}

describe('SheetHost', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.mocked(router.back).mockClear();
    jest.mocked(useReducedMotion).mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders its children', async () => {
    const view = await renderUi(
      <SheetHost>
        <Text>إعدادات</Text>
      </SheetHost>,
    );

    expect(view.getByText('إعدادات')).toBeOnTheScreen();
  });

  it('opens at the mid detent, half the window', async () => {
    const view = await renderUi(
      <SheetHost>
        <DetentProbe />
      </SheetHost>,
    );
    await settle();

    expect(view.getByTestId('sheet-host')).toHaveAnimatedStyle({ top: MID });
    expect(detentOf(view)).toBe('mid');
  });

  it('slides the card down on close without fading it, then leaves the route once, even when pressed twice', async () => {
    const view = await renderUi(
      <SheetHost>
        <Text>إعدادات</Text>
      </SheetHost>,
    );
    await settle();

    await fireEvent.press(view.getByTestId('sheet-backdrop'));
    expect(view.getByTestId('sheet-host')).toHaveAnimatedStyle({ opacity: 1 });
    expect(router.back).not.toHaveBeenCalled();

    await fireEvent.press(view.getByTestId('sheet-backdrop'));
    await settle();

    expect(view.getByTestId('sheet-host')).toHaveAnimatedStyle({ top: CLOSED });
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('expands to full and collapses back to mid through the sheet context', async () => {
    const view = await renderUi(
      <SheetHost>
        <DetentProbe />
      </SheetHost>,
    );
    await settle();

    await fireEvent.press(view.getByTestId('expand'));
    await settle();
    expect(view.getByTestId('sheet-host')).toHaveAnimatedStyle({ top: FULL });
    expect(detentOf(view)).toBe('full');

    await fireEvent.press(view.getByTestId('collapse'));
    await settle();
    expect(view.getByTestId('sheet-host')).toHaveAnimatedStyle({ top: MID });
    expect(detentOf(view)).toBe('mid');
    expect(router.back).not.toHaveBeenCalled();
  });

  it('closes with the VoiceOver escape gesture', async () => {
    const view = await renderUi(
      <SheetHost>
        <Text>إعدادات</Text>
      </SheetHost>,
    );
    await settle();

    const card = view.getByTestId('sheet-host');
    expect(card.props.onAccessibilityEscape).toEqual(expect.any(Function));
    await act(async () => {
      card.props.onAccessibilityEscape();
    });
    await settle();

    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('closes on Android back and removes its listener on unmount', async () => {
    const remove = jest.fn();
    const add = jest.spyOn(BackHandler, 'addEventListener').mockImplementation(() => ({ remove }));
    try {
      const view = await renderUi(
        <SheetHost>
          <Text>إعدادات</Text>
        </SheetHost>,
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

  it('opens with a fade at mid when Reduce Motion is on', async () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);

    const view = await renderUi(
      <SheetHost>
        <Text>إعدادات</Text>
      </SheetHost>,
    );

    expect(view.getByTestId('sheet-host')).toHaveAnimatedStyle({ opacity: 0 });
    await settle();
    expect(view.getByTestId('sheet-host')).toHaveAnimatedStyle({ opacity: 1, top: MID });
    expect(view.getByTestId('sheet-scrim')).toHaveAnimatedStyle({ opacity: 1 });
  });

  it('closes with a fade under Reduce Motion, then leaves the route', async () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    const view = await renderUi(
      <SheetHost>
        <Text>إعدادات</Text>
      </SheetHost>,
    );
    await settle();

    await fireEvent.press(view.getByTestId('sheet-backdrop'));
    expect(router.back).not.toHaveBeenCalled();
    await settle();

    expect(view.getByTestId('sheet-host')).toHaveAnimatedStyle({ opacity: 0, top: MID });
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('dims the page behind the sheet with the scrim colour', async () => {
    const view = await renderUi(
      <SheetHost>
        <Text>إعدادات</Text>
      </SheetHost>,
    );

    expect(flatStyle(view.getByTestId('sheet-scrim').props.style).backgroundColor).toBe(themes.light.colors.scrim);
  });

  it('marks the card as a modal view for assistive tech', async () => {
    const view = await renderUi(
      <SheetHost>
        <Text>إعدادات</Text>
      </SheetHost>,
    );

    expect(view.getByTestId('sheet-host').props.accessibilityViewIsModal).toBe(true);
  });

  it.each(locales)('labels the backdrop as a close button in %s', async (locale) => {
    const view = await renderUi(
      <SheetHost>
        <Text>{locale}</Text>
      </SheetHost>,
      { locale },
    );

    const backdrop = view.getByTestId('sheet-backdrop');
    expect(backdrop.props.accessibilityRole).toBe('button');
    expect(backdrop.props.accessibilityLabel).toBe(locale === 'ar' ? 'إغلاق' : 'Close');
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/components/SheetHost.tsx')).toEqual([]);
  });
});
