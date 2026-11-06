import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';

import { SuggestField } from './SuggestField';

const base = {
  label: 'البريد الإلكتروني',
  value: '',
  onChangeText: jest.fn(),
  placeholder: 'name@example.com',
  testID: 'field',
};

describe('SuggestField', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the label and an accessible input named by it', async () => {
    const view = await renderUi(<SuggestField {...base} />);

    expect(view.getByText('البريد الإلكتروني')).toBeOnTheScreen();
    expect(view.getByLabelText('البريد الإلكتروني')).toBeOnTheScreen();
  });

  it('reports typed text through onChangeText', async () => {
    const view = await renderUi(<SuggestField {...base} />);

    fireEvent.changeText(view.getByTestId('field-input'), 'ahmad@example.com');

    expect(base.onChangeText).toHaveBeenCalledWith('ahmad@example.com');
  });

  it('shows the error line and a danger border when invalid', async () => {
    const view = await renderUi(<SuggestField {...base} error="أدخل بريداً إلكترونياً صحيحاً." />);

    expect(view.getByTestId('field-error')).toHaveTextContent('أدخل بريداً إلكترونياً صحيحاً.');
    // The invalid border is the 1.5 pt focus stroke, drawn in the theme's danger colour.
    expect(flatStyle(view.getByTestId('field-input').props.style).borderWidth).toBe(1.5);
    expect(view.getByTestId('field-input').props['aria-invalid']).toBe(true);
    expect(view.getByLabelText('البريد الإلكتروني')).toHaveProp('accessibilityHint', 'أدخل بريداً إلكترونياً صحيحاً.');
  });

  it('has no error line or invalid state when valid', async () => {
    const view = await renderUi(<SuggestField {...base} />);

    expect(view.queryByTestId('field-error')).toBeNull();
    expect(view.getByTestId('field-input').props['aria-invalid']).toBe(false);
  });

  it('shows a hint and a counter in the footer, and no footer without either', async () => {
    const view = await renderUi(<SuggestField {...base} counter="١٢٠ / ٥٠٠٠" hint="نستخدم بريدك للرد." kind="multiline" />);

    expect(view.getByTestId('field-footer')).toBeOnTheScreen();
    expect(view.getByText('نستخدم بريدك للرد.')).toBeOnTheScreen();
    expect(view.getByTestId('field-counter')).toHaveTextContent('١٢٠ / ٥٠٠٠');

    const bare = await renderUi(<SuggestField {...base} />);
    expect(bare.queryByTestId('field-footer')).toBeNull();
  });

  it('is a tall multiline box in the message kind', async () => {
    const view = await renderUi(<SuggestField {...base} kind="multiline" />);

    const input = flatStyle(view.getByTestId('field-input').props.style);
    expect(input.height).toBe(150);
    expect(view.getByTestId('field-input').props.multiline).toBe(true);
  });

  it('is not editable and dims while editable is false', async () => {
    const view = await renderUi(<SuggestField {...base} editable={false} />);

    expect(view.getByTestId('field-input').props.editable).toBe(false);
    expect(flatStyle(view.getByTestId('field-input').props.style).opacity).toBe(0.6);
  });

  it.each(locales)('takes email keyboard settings and reads left to right in %s', async (locale) => {
    const view = await renderUi(<SuggestField {...base} kind="email" />, { locale });
    const input = view.getByTestId('field-input');

    expect(input.props.keyboardType).toBe('email-address');
    expect(input.props.autoCapitalize).toBe('none');
    expect(input.props.autoComplete).toBe('email');
    expect(flatStyle(input.props.style).writingDirection).toBe('ltr');
    expect(flatStyle(input.props.style).textAlign).toBe(locale === 'ar' ? 'right' : 'left');
  });

  it.each(locales)('renders its footer hint in %s', async (locale) => {
    const view = await renderUi(<SuggestField {...base} hint="تلميح" />, { locale });

    expect(view.getByText('تلميح')).toBeOnTheScreen();
  });
});
