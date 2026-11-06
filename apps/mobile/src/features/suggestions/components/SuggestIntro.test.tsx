import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';

import { SuggestIntro } from './SuggestIntro';

describe('SuggestIntro', () => {
  it.each(locales)('renders the text in %s', async (locale) => {
    const view = await renderUi(<SuggestIntro text="نقرأ كل الاقتراحات." />, { locale });

    expect(view.getByTestId('suggest-intro')).toHaveTextContent('نقرأ كل الاقتراحات.');
  });

  it('uses the muted tone of the subhead style', async () => {
    const view = await renderUi(<SuggestIntro text="x" />);

    expect(flatStyle(view.getByTestId('suggest-intro').props.style)).toMatchObject({ fontSize: 15, lineHeight: 22 });
  });
});
