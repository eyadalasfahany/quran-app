import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { NumberRing } from './NumberRing';

const hidden = { includeHiddenElements: true } as const;

describe('NumberRing', () => {
  it.each(locales)('shows the number in Arabic-Indic digits in %s', async (locale) => {
    const view = await renderUi(<NumberRing number={12} />, { locale });

    expect(view.getByText('١٢', hidden)).toBeOnTheScreen();
  });

  it('draws a gold ring of the list-row diameter', async () => {
    const view = await renderUi(<NumberRing number={1} testID="ring" />);
    const style = flatStyle(view.getByTestId('ring', hidden).props.style);

    expect(style).toMatchObject({ borderRadius: 18, height: 36, width: 36 });
    expect(style.borderColor).toBe(themes.light.colors.gold);
  });

  it('is hidden from screen readers, because the row carries the label', async () => {
    const view = await renderUi(<NumberRing number={1} testID="ring" />);

    expect(view.getByTestId('ring', hidden).props.accessibilityElementsHidden).toBe(true);
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiterals('NumberRing.tsx')).toEqual([]);
  });
});
