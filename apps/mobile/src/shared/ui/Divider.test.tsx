import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { Divider } from './Divider';

const colors = themes.light.colors;
const hidden = { includeHiddenElements: true };

describe('Divider', () => {
  it('draws a 1 pt line, hidden from screen readers', async () => {
    const view = await renderUi(<Divider testID="divider" />);
    const divider = view.getByTestId('divider', hidden);

    expect(flatStyle(divider.props.style)).toMatchObject({ backgroundColor: colors.line, height: 1 });
    expect(divider.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('draws the strong and vertical variants', async () => {
    const view = await renderUi(<Divider strong testID="divider" vertical />);

    expect(flatStyle(view.getByTestId('divider', hidden).props.style)).toMatchObject({
      backgroundColor: colors.lineStrong,
      width: 1,
    });
  });

  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderUi(<Divider testID="divider" />, { locale });

    expect(view.getByTestId('divider', hidden)).toBeTruthy();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('Divider.tsx')).toEqual([]);
  });
});
