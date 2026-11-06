import { locales, renderUi } from '../../../../jest/render-ui';

import { SuggestStatusBanner } from './SuggestStatusBanner';

describe('SuggestStatusBanner', () => {
  it.each(['offline', 'limited', 'failed'] as const)('shows the %s message', async (kind) => {
    const view = await renderUi(<SuggestStatusBanner kind={kind} />);

    expect(view.getByTestId('suggest-status')).toHaveTextContent(new RegExp(`.+`));
    // The glyph is decorative, so it is hidden from screen readers.
    expect(view.getByTestId('suggest-status-icon', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('reads the offline message as one labelled text, with the glyph hidden', async () => {
    const view = await renderUi(<SuggestStatusBanner kind="offline" />);

    expect(view.getByRole('text', { name: 'لا يوجد اتصال بالإنترنت. اقتراحك محفوظ هنا؛ أعد المحاولة عند الاتصال.' })).toBeOnTheScreen();
  });

  it.each(locales)('renders the limited message in %s', async (locale) => {
    const view = await renderUi(<SuggestStatusBanner kind="limited" />, { locale });

    expect(view.getByTestId('suggest-status')).toHaveTextContent(locale === 'ar' ? 'أرسلت اقتراحات كثيرة. حاول لاحقاً.' : 'Too many suggestions sent. Please try again later.');
  });
});
