import { act, fireEvent, waitFor, within } from '@testing-library/react-native';
import { AccessibilityInfo, Dimensions, I18nManager } from 'react-native';
import { useReducedMotion, withSpring, withTiming } from 'react-native-reanimated';

// @ts-expect-error React Native's internal renderer proxy has no type declarations; the focus test stubs its node lookup.
import * as RendererProxy from 'react-native/Libraries/ReactNative/RendererProxy';

import { ThemeProvider, themes } from '@/core/theme';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';

import { ConfirmDialog } from './ConfirmDialog';

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  // The mock is an ES module, so the default import (Animated) resolves.
  return {
    ...actual,
    __esModule: true,
    default: actual.default,
    useReducedMotion: jest.fn(() => false),
    withSpring: jest.fn(actual.withSpring),
    withTiming: jest.fn(actual.withTiming),
  };
});

const mockLiquidGlass = jest.fn(() => false);

jest.mock('expo-glass-effect', () => ({
  ...jest.requireActual('expo-glass-effect'),
  isLiquidGlassAvailable: () => mockLiquidGlass(),
}));

const mockReduceMotion = useReducedMotion as unknown as jest.Mock;
const mockSpring = withSpring as unknown as jest.Mock;
const mockTiming = withTiming as unknown as jest.Mock;

// The card fades in, so until its animation ends it is hidden to the query, as a dialog is mid-open on a device.
const SHOWN = { includeHiddenElements: true } as const;
const reset = { ios: 'arrow.counterclockwise', android: 'restart_alt' } as const;

const copy = {
  ar: { cancel: 'إلغاء', confirm: 'إعادة الضبط', message: 'يعود العداد إلى صفر.', title: 'إعادة ضبط العداد؟' },
  en: { cancel: 'Cancel', confirm: 'Reset', message: 'The counter goes back to zero.', title: 'Reset the counter?' },
} as const;

type Props = Partial<React.ComponentProps<typeof ConfirmDialog>>;

function dialog(props: Props = {}, locale: 'ar' | 'en' = 'en') {
  return (
    <ConfirmDialog
      cancelLabel={copy[locale].cancel}
      confirmLabel={copy[locale].confirm}
      message={copy[locale].message}
      onCancel={() => undefined}
      onConfirm={() => undefined}
      title={copy[locale].title}
      visible
      {...props}
    />
  );
}

// Each timed call as its target and duration; the exit calls also pass a completion callback.
function timedCalls() {
  return mockTiming.mock.calls.map(([to, config]: [number, { duration: number }]) => [to, config.duration]);
}

function setWindowWidth(width: number) {
  Dimensions.set({
    screen: { fontScale: 1, height: 844, scale: 1, width },
    window: { fontScale: 1, height: 844, scale: 1, width },
  });
}

describe('ConfirmDialog', () => {
  beforeEach(() => {
    mockReduceMotion.mockReturnValue(false);
    mockLiquidGlass.mockReturnValue(false);
    mockSpring.mockClear();
    mockTiming.mockClear();
    setWindowWidth(390);
  });

  afterAll(() => {
    setWindowWidth(750);
  });

  it('renders nothing when it is not visible', async () => {
    const view = await renderUi(dialog({ visible: false }), { locale: 'en' });

    expect(view.queryByText('Reset the counter?', SHOWN)).toBeNull();
  });

  it.each(locales)('renders the title, the message and both buttons in %s', async (locale) => {
    const view = await renderUi(dialog({}, locale), { locale });

    expect(view.getByText(copy[locale].title, SHOWN)).toBeOnTheScreen();
    expect(view.getByText(copy[locale].message, SHOWN)).toBeOnTheScreen();
    expect(view.getByRole('button', { name: copy[locale].cancel, ...SHOWN })).toBeOnTheScreen();
    expect(view.getByRole('button', { name: copy[locale].confirm, ...SHOWN })).toBeOnTheScreen();
  });

  it('leaves out the message when there is none', async () => {
    const view = await renderUi(dialog({ message: undefined }), { locale: 'en' });

    expect(view.queryByTestId('confirm-dialog-message', SHOWN)).toBeNull();
  });

  it('shows one button when there is no cancel label', async () => {
    const view = await renderUi(dialog({ cancelLabel: undefined, confirmLabel: 'Done' }), { locale: 'en' });

    expect(view.getAllByRole('button', SHOWN)).toHaveLength(1);
    expect(view.getByRole('button', { name: 'Done', ...SHOWN })).toBeOnTheScreen();
    expect(view.queryByTestId('confirm-dialog-cancel', SHOWN)).toBeNull();
  });

  it('calls onConfirm for the confirm button and not onCancel', async () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    const view = await renderUi(dialog({ onCancel, onConfirm }), { locale: 'en' });

    fireEvent.press(view.getByRole('button', { name: 'Reset', ...SHOWN }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it.each(['cancel button', 'scrim', 'Android back'] as const)('calls onCancel from the %s', async (trigger) => {
    const onCancel = jest.fn();
    const onConfirm = jest.fn();
    const view = await renderUi(dialog({ onCancel, onConfirm }), { locale: 'en' });

    if (trigger === 'cancel button') {
      fireEvent.press(view.getByRole('button', { name: 'Cancel', ...SHOWN }));
    } else if (trigger === 'scrim') {
      fireEvent.press(view.getByTestId('confirm-dialog-scrim', SHOWN));
    } else {
      fireEvent(view.getByTestId('confirm-dialog'), 'requestClose');
    }

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('fills the confirm action with the danger colour when destructive, and with the brand colour otherwise', async () => {
    const destructive = await renderUi(dialog({ destructive: true }), { locale: 'en' });
    expect(flatStyle(destructive.getByRole('button', { name: 'Reset', ...SHOWN }).props.style).backgroundColor).toBe(
      themes.light.colors.danger,
    );

    const plain = await renderUi(dialog({ destructive: false }), { locale: 'en' });
    expect(flatStyle(plain.getByRole('button', { name: 'Reset', ...SHOWN }).props.style).backgroundColor).toBe(
      themes.light.colors.brand,
    );
  });

  it('labels the filled confirm action in the on-brand colour, which reads on both fills', async () => {
    const view = await renderUi(dialog({ destructive: true }), { locale: 'en' });

    expect(flatStyle(within(view.getByTestId('confirm-dialog-confirm', SHOWN)).getByText('Reset').props.style).color).toBe(
      themes.light.colors.onBrand,
    );
  });

  it('fills Cancel as a tonal neutral rather than an outline', async () => {
    const view = await renderUi(dialog(), { locale: 'en' });
    const cancel = flatStyle(view.getByRole('button', { name: 'Cancel', ...SHOWN }).props.style);

    expect(cancel.backgroundColor).toBe(themes.light.colors.fillSecondary);
    expect(flatStyle(within(view.getByTestId('confirm-dialog-cancel', SHOWN)).getByText('Cancel').props.style).color).toBe(
      themes.light.colors.ink,
    );
  });

  it('keeps every button at least 44 pt high, at the 48 pt design height', async () => {
    const view = await renderUi(dialog(), { locale: 'en' });

    for (const name of ['Cancel', 'Reset']) {
      expect(flatStyle(view.getByRole('button', { name, ...SHOWN }).props.style).minHeight).toBe(48);
    }
  });

  it('lists Cancel first, so under Arabic it sits at the reading start', async () => {
    const view = await renderUi(dialog({}, 'ar'), { locale: 'ar' });

    // The buttons sit in a plain row, which React Native mirrors under RTL: the first button is at the reading start.
    expect(I18nManager.isRTL).toBe(true);
    const labels = view.getAllByRole('button', SHOWN).map((button) => button.props.accessibilityLabel);
    expect(labels).toEqual([copy.ar.cancel, copy.ar.confirm]);
  });

  it('lists Cancel first in English too, so it sits at the reading start on the left', async () => {
    const view = await renderUi(dialog(), { locale: 'en' });

    expect(I18nManager.isRTL).toBe(false);
    const labels = view.getAllByRole('button', SHOWN).map((button) => button.props.accessibilityLabel);
    expect(labels).toEqual([copy.en.cancel, copy.en.confirm]);
  });

  it('shows the icon badge in the destructive tone when an icon is given to a destructive dialog', async () => {
    const view = await renderUi(dialog({ destructive: true, icon: reset }), { locale: 'en' });

    expect(view.getByTestId('confirm-dialog-icon', SHOWN)).toBeOnTheScreen();
    expect(flatStyle(view.getByTestId('confirm-dialog-icon-tint', SHOWN).props.style).backgroundColor).toBe(
      themes.light.colors.danger,
    );
  });

  it('shows the icon badge in the brand tone for a plain dialog', async () => {
    const view = await renderUi(dialog({ icon: reset }), { locale: 'en' });

    expect(flatStyle(view.getByTestId('confirm-dialog-icon-tint', SHOWN).props.style).backgroundColor).toBe(
      themes.light.colors.brand,
    );
  });

  it('leaves out the icon badge when no icon is given', async () => {
    const view = await renderUi(dialog(), { locale: 'en' });

    expect(view.queryByTestId('confirm-dialog-icon', SHOWN)).toBeNull();
  });

  it('sets the title at the title step, semibold, and the message at the body step', async () => {
    const view = await renderUi(dialog(), { locale: 'en' });

    expect(flatStyle(view.getByText('Reset the counter?', SHOWN).props.style).fontSize).toBe(22);
    expect(flatStyle(view.getByText('The counter goes back to zero.', SHOWN).props.style).fontSize).toBe(17);
  });

  it.each(locales)('marks the card as a modal and the title as a header in %s', async (locale) => {
    const view = await renderUi(dialog({}, locale), { locale });

    expect(view.getByTestId('confirm-dialog-card', SHOWN).props.accessibilityViewIsModal).toBe(true);
    expect(view.getByRole('header', { name: copy[locale].title, ...SHOWN })).toBeOnTheScreen();
  });

  it('moves accessibility focus to the title once the dialog is on screen', async () => {
    // The test renderer has no native views, so the title's tag is stubbed; the focus call is what is checked.
    const tag = jest.spyOn(RendererProxy as unknown as { findNodeHandle: (node: unknown) => number | null }, 'findNodeHandle');
    // Other React Native code asks for a native tag first, so the stub answers every call.
    tag.mockReturnValue(7);
    const focus = jest.spyOn(AccessibilityInfo, 'setAccessibilityFocus').mockImplementation(() => undefined);
    const view = await renderUi(dialog(), { locale: 'en' });

    fireEvent(view.getByTestId('confirm-dialog'), 'show');

    expect(focus).toHaveBeenCalledWith(7);
    tag.mockRestore();
    focus.mockRestore();
  });

  it('sizes the card at 340 pt in a wide window', async () => {
    const view = await renderUi(dialog(), { locale: 'en' });

    expect(flatStyle(view.getByTestId('confirm-dialog-card', SHOWN).props.style).width).toBe(340);
  });

  it('sizes the card to the window less 24 pt on each side in a narrow one', async () => {
    setWindowWidth(360);
    const view = await renderUi(dialog(), { locale: 'en' });

    expect(flatStyle(view.getByTestId('confirm-dialog-card', SHOWN).props.style).width).toBe(312);
  });

  it('draws the card with the xl radius, the raised surface and the glass shadow', async () => {
    const view = await renderUi(dialog(), { locale: 'en' });
    const card = flatStyle(view.getByTestId('confirm-dialog-card', SHOWN).props.style);

    expect(card.borderRadius).toBe(themes.light.radius.xl);
    expect(card.backgroundColor).toBe(themes.light.colors.surfaceRaised);
    expect(card.boxShadow).toBe(themes.light.shadows.glass);
  });

  it('draws no hairline border on the card in light mode', async () => {
    const view = await renderUi(dialog(), { locale: 'en' });

    expect(flatStyle(view.getByTestId('confirm-dialog-card', SHOWN).props.style).borderWidth).toBe(0);
  });

  it('draws a hairline border on the card in dark mode', async () => {
    const view = await renderUi(dialog(), { locale: 'en', theme: 'dark' });

    expect(flatStyle(view.getByTestId('confirm-dialog-card', SHOWN).props.style).borderWidth).toBe(1);
  });

  it('dims the screen with the theme scrim', async () => {
    const view = await renderUi(dialog(), { locale: 'en' });

    expect(flatStyle(view.getByTestId('confirm-dialog-dim', SHOWN).props.style).backgroundColor).toBe(
      themes.light.colors.scrim,
    );
  });

  it('adds native blur under the scrim when Liquid Glass is available', async () => {
    mockLiquidGlass.mockReturnValue(true);
    const view = await renderUi(dialog(), { locale: 'en' });

    expect(view.getByTestId('confirm-dialog-scrim-glass', SHOWN)).toBeOnTheScreen();
  });

  it('dims with no native blur where Liquid Glass is unavailable', async () => {
    const view = await renderUi(dialog(), { locale: 'en' });

    expect(view.queryByTestId('confirm-dialog-scrim-glass', SHOWN)).toBeNull();
  });

  it('springs the card in from 92% with motion', async () => {
    await renderUi(dialog(), { locale: 'en' });

    expect(mockSpring).toHaveBeenCalledWith(1, expect.anything());
  });

  it('fades only, with no spring, when Reduce Motion is on', async () => {
    mockReduceMotion.mockReturnValue(true);
    const view = await renderUi(dialog(), { locale: 'en' });

    expect(mockSpring).not.toHaveBeenCalled();
    // The fade still runs: the card's opacity and the scrim use a timed fade of the standard duration (200 ms).
    expect(mockTiming).toHaveBeenCalledWith(1, expect.objectContaining({ duration: 200 }));
    expect(view.getByTestId('confirm-dialog-card', SHOWN)).toBeOnTheScreen();
  });

  it('closes faster, fading and shrinking to 96%, and under Reduce Motion only fades', async () => {
    const view = await renderUi(dialog({ visible: true }), { locale: 'en' });
    mockTiming.mockClear();

    // Effects run inside an async act, so the close animation starts before the assertions.
    await act(async () => {
      view.rerender(<ThemeProvider name="light">{dialog({ visible: false })}</ThemeProvider>);
    });

    expect(timedCalls()).toEqual(expect.arrayContaining([[0, 150], [0.96, 150]]));
  });

  it('does not shrink on close under Reduce Motion', async () => {
    mockReduceMotion.mockReturnValue(true);
    const view = await renderUi(dialog({ visible: true }), { locale: 'en' });
    mockTiming.mockClear();

    // Effects run inside an async act, so the close animation starts before the assertions.
    await act(async () => {
      view.rerender(<ThemeProvider name="light">{dialog({ visible: false })}</ThemeProvider>);
    });

    expect(timedCalls()).toContainEqual([0, 150]);
    expect(timedCalls()).not.toContainEqual([0.96, 150]);
  });

  it('stays mounted through its exit, then leaves the screen', async () => {
    const view = await renderUi(dialog({ visible: true }), { locale: 'en' });

    // Effects run inside an async act, so the close animation starts before the assertions.
    await act(async () => {
      view.rerender(<ThemeProvider name="light">{dialog({ visible: false })}</ThemeProvider>);
    });

    await waitFor(() => expect(view.queryByText('Reset the counter?', SHOWN)).toBeNull());
  });

  it('takes its card and text colours from the dark theme', async () => {
    const view = await renderUi(dialog(), { locale: 'en', theme: 'dark' });

    expect(flatStyle(view.getByTestId('confirm-dialog-card', SHOWN).props.style).backgroundColor).toBe('#172421');
    expect(flatStyle(view.getByText('Reset the counter?', SHOWN).props.style).color).toBe('#ece6d8');
  });

  it('dims the dark theme with its own scrim', async () => {
    const view = await renderUi(dialog(), { locale: 'en', theme: 'dark' });

    expect(flatStyle(view.getByTestId('confirm-dialog-dim', SHOWN).props.style).backgroundColor).toBe(
      themes.dark.colors.scrim,
    );
  });

  it('uses no raw colour literals', () => {
    expect(rawColorLiterals('ConfirmDialog.tsx')).toEqual([]);
  });
});
