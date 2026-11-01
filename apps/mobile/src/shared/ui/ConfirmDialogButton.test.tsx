import { fireEvent } from '@testing-library/react-native';

import { themes } from '@/core/theme';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';

import { CONFIRM_BUTTON_HEIGHT, ConfirmDialogButton, type ConfirmDialogButtonTone } from './ConfirmDialogButton';

const light = themes.light.colors;

describe('ConfirmDialogButton', () => {
  it.each([
    ['neutral', light.fillSecondary, light.ink],
    ['brand', light.brand, light.onBrand],
    ['destructive', light.danger, light.onBrand],
  ] as const)('fills the %s tone with its colour and labels it in its text colour', async (tone, fill, text) => {
    const view = await renderUi(<ConfirmDialogButton label="Reset" onPress={() => undefined} tone={tone} testID="button" />, {
      locale: 'en',
    });

    expect(flatStyle(view.getByRole('button', { name: 'Reset' }).props.style).backgroundColor).toBe(fill);
    expect(flatStyle(view.getByText('Reset').props.style).color).toBe(text);
  });

  it('is a full pill 48 pt tall, above the 44 pt touch target', async () => {
    const view = await renderUi(<ConfirmDialogButton label="Reset" onPress={() => undefined} tone="brand" testID="button" />, {
      locale: 'en',
    });
    const style = flatStyle(view.getByTestId('button').props.style);

    expect(CONFIRM_BUTTON_HEIGHT).toBe(48);
    expect(style.minHeight).toBe(48);
    expect(style.borderRadius).toBe(themes.light.radius.pill);
  });

  it('is announced as a button with its label', async () => {
    const view = await renderUi(<ConfirmDialogButton label="Cancel" onPress={() => undefined} tone="neutral" />, {
      locale: 'en',
    });

    expect(view.getByRole('button', { name: 'Cancel' })).toBeOnTheScreen();
  });

  it('calls onPress when tapped', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<ConfirmDialogButton label="Reset" onPress={onPress} tone="destructive" />, {
      locale: 'en',
    });

    fireEvent.press(view.getByRole('button', { name: 'Reset' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('centres its label in %s', async (locale) => {
    const view = await renderUi(<ConfirmDialogButton label="label" onPress={() => undefined} tone="neutral" />, { locale });

    expect(flatStyle(view.getByText('label').props.style).textAlign).toBe('center');
  });

  it.each(['neutral', 'brand', 'destructive'] satisfies ConfirmDialogButtonTone[])(
    'draws the %s tone in the dark theme without a light fill',
    async (tone) => {
      const view = await renderUi(<ConfirmDialogButton label="Reset" onPress={() => undefined} tone={tone} />, {
        locale: 'en',
        theme: 'dark',
      });

      expect(flatStyle(view.getByRole('button', { name: 'Reset' }).props.style).backgroundColor).toBe(
        themes.dark.colors[tone === 'neutral' ? 'fillSecondary' : tone === 'brand' ? 'brand' : 'danger'],
      );
    },
  );

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('ConfirmDialogButton.tsx')).toEqual([]);
  });
});
