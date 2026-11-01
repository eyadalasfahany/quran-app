import { act, fireEvent } from '@testing-library/react-native';
import { I18nManager } from 'react-native';

import { themes } from '@/core/theme';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';

import { ConfirmDialogActions, fitsSideBySide } from './ConfirmDialogActions';

// The measuring layer is hidden from screen readers, so queries have to opt in to see it.
const hidden = { includeHiddenElements: true } as const;

type Rendered = Awaited<ReturnType<typeof renderUi>>;
type Props = Partial<React.ComponentProps<typeof ConfirmDialogActions>>;

function actions(props: Props = {}) {
  return (
    <ConfirmDialogActions
      cancelLabel="Cancel"
      confirmLabel="Reset"
      destructive
      onCancel={() => undefined}
      onConfirm={() => undefined}
      testID="dialog"
      {...props}
    />
  );
}

// The device's layout pass reports the row's width and each measured label's width; the tests report them the same way.
// Each report is awaited in its own act, so consecutive reports do not overlap.
async function reportLayout(view: Rendered, testID: string, width: number) {
  await act(async () => {
    fireEvent(view.getByTestId(testID, hidden), 'layout', { nativeEvent: { layout: { width } } });
  });
}

function reportRow(view: Rendered, width: number) {
  return reportLayout(view, 'dialog-actions', width);
}

function reportLabel(view: Rendered, key: 'cancel' | 'confirm', width: number) {
  return reportLayout(view, 'dialog-measure-' + key, width);
}

function buttonLabels(view: Rendered) {
  return view.getAllByRole('button', hidden).map((button) => button.props.accessibilityLabel);
}

describe('fitsSideBySide', () => {
  it('fits when the wider label, with its padding on both sides, is no wider than half the row less the gap', async () => {
    // Half of (300 - 12) is 144, and the wider label is 112 with 16 pt padding each side (112 + 32 = 144).
    expect(fitsSideBySide(300, [60, 112], 12, 16)).toBe(true);
  });

  it('stacks when the wider label is wider than its half of the row', async () => {
    expect(fitsSideBySide(300, [60, 113], 12, 16)).toBe(false);
  });
});

describe('ConfirmDialogActions', () => {
  it.each(locales)('keeps the two buttons side by side when the labels fit (%s)', async (locale) => {
    const view = await renderUi(actions(), { locale });
    await reportRow(view, 300);
    await reportLabel(view, 'cancel', 60);
    await reportLabel(view, 'confirm', 70);

    expect(flatStyle(view.getByTestId('dialog-actions', hidden).props.style).flexDirection).toBe('row');
    expect(flatStyle(view.getByTestId('dialog-cancel', hidden).props.style).flex).toBe(1);
    expect(flatStyle(view.getByTestId('dialog-confirm', hidden).props.style).flex).toBe(1);
  });

  it('stays side by side when the wider label sits exactly on the fitting width', async () => {
    const view = await renderUi(actions(), { locale: 'en' });
    await reportRow(view, 300);
    await reportLabel(view, 'cancel', 112);
    await reportLabel(view, 'confirm', 112);

    expect(flatStyle(view.getByTestId('dialog-actions', hidden).props.style).flexDirection).toBe('row');
  });

  it('stacks full width, confirm on top, when the labels do not fit side by side', async () => {
    const view = await renderUi(actions({ cancelLabel: 'Cancel the reset of the counter', confirmLabel: 'Reset everything' }), {
      locale: 'en',
    });
    await reportRow(view, 300);
    await reportLabel(view, 'cancel', 220);
    await reportLabel(view, 'confirm', 150);

    expect(flatStyle(view.getByTestId('dialog-actions', hidden).props.style).flexDirection).toBe('column');
    expect(flatStyle(view.getByTestId('dialog-confirm', hidden).props.style).alignSelf).toBe('stretch');
    expect(flatStyle(view.getByTestId('dialog-cancel', hidden).props.style).alignSelf).toBe('stretch');
    expect(buttonLabels(view)).toEqual(['Reset everything', 'Cancel the reset of the counter']);
  });

  it('keeps the side-by-side order and does not stack before the row is measured', async () => {
    const view = await renderUi(actions(), { locale: 'en' });
    await reportLabel(view, 'cancel', 400);
    await reportLabel(view, 'confirm', 400);

    expect(flatStyle(view.getByTestId('dialog-actions', hidden).props.style).flexDirection).toBe('row');
    expect(buttonLabels(view)).toEqual(['Cancel', 'Reset']);
  });

  it('does not stack until both labels are measured', async () => {
    const view = await renderUi(actions(), { locale: 'en' });
    await reportRow(view, 300);
    await reportLabel(view, 'confirm', 400);

    expect(flatStyle(view.getByTestId('dialog-actions', hidden).props.style).flexDirection).toBe('row');
  });

  it('shows one full-width confirm button, and no cancel button, without a cancel label', async () => {
    const view = await renderUi(actions({ cancelLabel: undefined, confirmLabel: 'Done', destructive: false }), {
      locale: 'en',
    });

    expect(buttonLabels(view)).toEqual(['Done']);
    expect(flatStyle(view.getByTestId('dialog-confirm', hidden).props.style).alignSelf).toBe('stretch');
    expect(view.queryByTestId('dialog-measure', hidden)).toBeNull();
  });

  it.each(locales)('lists Cancel first in %s, so the row puts it at the reading start', async (locale) => {
    const view = await renderUi(actions(), { locale });

    // A plain row is mirrored under RTL: the first button is on the right in Arabic and on the left in English.
    expect(I18nManager.isRTL).toBe(locale === 'ar');
    expect(flatStyle(view.getByTestId('dialog-actions', hidden).props.style).flexDirection).toBe('row');
    expect(buttonLabels(view)).toEqual(['Cancel', 'Reset']);
  });

  it('stacks confirm on top under Arabic too, since a stacked column is not mirrored', async () => {
    const view = await renderUi(actions({ cancelLabel: 'Cancel the reset of the counter', confirmLabel: 'Reset everything' }), {
      locale: 'ar',
    });
    await reportRow(view, 300);
    await reportLabel(view, 'cancel', 220);
    await reportLabel(view, 'confirm', 150);

    expect(buttonLabels(view)).toEqual(['Reset everything', 'Cancel the reset of the counter']);
  });

  it('fills the confirm action with the danger colour when destructive, and the brand colour otherwise', async () => {
    const destructive = await renderUi(actions({ destructive: true }), { locale: 'en' });
    expect(flatStyle(destructive.getByTestId('dialog-confirm', hidden).props.style).backgroundColor).toBe(
      themes.light.colors.danger,
    );

    const plain = await renderUi(actions({ destructive: false }), { locale: 'en' });
    expect(flatStyle(plain.getByTestId('dialog-confirm', hidden).props.style).backgroundColor).toBe(
      themes.light.colors.brand,
    );
  });

  it('fills Cancel as a tonal neutral, not an outline', async () => {
    const view = await renderUi(actions(), { locale: 'en' });
    const style = flatStyle(view.getByTestId('dialog-cancel', hidden).props.style);

    expect(style.backgroundColor).toBe(themes.light.colors.fillSecondary);
    expect(style.borderWidth).toBeUndefined();
  });

  it('hides the measuring layer from screen readers and from touch', async () => {
    const view = await renderUi(actions(), { locale: 'en' });
    const measure = view.getByTestId('dialog-measure', hidden);

    expect(measure.props.accessibilityElementsHidden).toBe(true);
    expect(measure.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(measure.props.pointerEvents).toBe('none');
    expect(flatStyle(measure.props.style).opacity).toBe(0);
  });

  it('calls onConfirm and onCancel from their buttons', async () => {
    const onCancel = jest.fn();
    const onConfirm = jest.fn();
    const view = await renderUi(actions({ onCancel, onConfirm }), { locale: 'en' });

    fireEvent.press(view.getByRole('button', { name: 'Cancel' }));
    fireEvent.press(view.getByRole('button', { name: 'Reset' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('has no raw colour literals', async () => {
    expect(rawColorLiterals('ConfirmDialogActions.tsx')).toEqual([]);
  });
});
