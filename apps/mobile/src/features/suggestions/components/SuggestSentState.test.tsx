import { locales, renderUi } from '../../../../jest/render-ui';

import { SuggestSentState } from './SuggestSentState';

describe('SuggestSentState', () => {
  it.each(locales)('shows the check, title and body in %s', async (locale) => {
    const view = await renderUi(<SuggestSentState />, { locale });

    expect(view.getByTestId('suggest-sent-check', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(view.getByRole('header', { name: locale === 'ar' ? 'شكراً لك على اقتراحك' : 'Thank you for your suggestion' })).toBeOnTheScreen();
    expect(view.getByTestId('suggest-sent-body')).toHaveTextContent(/\S/);
  });

  it('hides the decorative check from screen readers', async () => {
    const view = await renderUi(<SuggestSentState />);

    expect(view.getByTestId('suggest-sent-check', { includeHiddenElements: true }).parent?.props.accessibilityElementsHidden).toBe(true);
  });
});
