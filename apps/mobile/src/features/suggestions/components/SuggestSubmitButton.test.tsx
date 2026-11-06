import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';

import { SuggestSubmitButton } from './SuggestSubmitButton';

describe('SuggestSubmitButton', () => {
  it.each(locales)('is a labelled button in %s', async (locale) => {
    const view = await renderUi(<SuggestSubmitButton label="أرسل الاقتراح" onPress={jest.fn()} />, { locale });

    expect(view.getByRole('button', { name: 'أرسل الاقتراح' })).toBeOnTheScreen();
    expect(view.queryByTestId('suggest-submit-spinner')).toBeNull();
  });

  it('calls onPress when idle', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<SuggestSubmitButton label="أرسل الاقتراح" onPress={onPress} />);

    fireEvent.press(view.getByRole('button', { name: 'أرسل الاقتراح' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is busy, dimmed and takes no presses with a spinner while busy', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<SuggestSubmitButton busy label="جارٍ الإرسال…" onPress={onPress} />);
    const button = view.getByRole('button', { name: 'جارٍ الإرسال…' });

    expect(button).toHaveProp('accessibilityState', expect.objectContaining({ busy: true, disabled: true }));
    expect(flatStyle(button.props.style).opacity).toBe(0.7);
    expect(view.getByTestId('suggest-submit-spinner', { includeHiddenElements: true })).toBeOnTheScreen();

    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('keeps a 52 pt minimum height', async () => {
    const view = await renderUi(<SuggestSubmitButton label="x" onPress={jest.fn()} />);

    expect(flatStyle(view.getByRole('button').props.style).minHeight).toBe(52);
  });
});
