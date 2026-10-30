import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { UiText } from './UiText';

import { MedallionOutline } from './MedallionOutline';

const hidden = { includeHiddenElements: true } as const;

describe('MedallionOutline', () => {
  it('draws the gold star from two squares, one turned 45°, in a 38 pt box', async () => {
    const view = await renderUi(<MedallionOutline testID="star" />);
    const star = view.getByTestId('star', hidden);
    const [square, turned] = star.children.filter((child) => typeof child === 'object');

    expect(flatStyle(star.props.style)).toMatchObject({ height: 38, width: 38 });
    expect(flatStyle(typeof square === 'object' ? square.props.style : undefined)).toMatchObject({
      borderColor: themes.light.colors.gold,
      height: 24,
      width: 24,
    });
    expect(flatStyle(typeof turned === 'object' ? turned.props.style : undefined).transform).toEqual([{ rotate: '45deg' }]);
  });

  it('keeps its children at the centre of the star', async () => {
    const view = await renderUi(
      <MedallionOutline testID="star">
        <UiText>x</UiText>
      </MedallionOutline>,
    );

    expect(flatStyle(view.getByTestId('star', hidden).props.style)).toMatchObject({ alignItems: 'center', justifyContent: 'center' });
  });

  it.each(locales)('applies the opacity when given, in %s', async (locale) => {
    const view = await renderUi(<MedallionOutline opacity={0.35} testID="star" />, { locale });

    expect(flatStyle(view.getByTestId('star', hidden).props.style).opacity).toBe(0.35);
  });

  it('is hidden from screen readers', async () => {
    const view = await renderUi(<MedallionOutline testID="star" />);

    expect(view.getByTestId('star', hidden).props.accessibilityElementsHidden).toBe(true);
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('MedallionOutline.tsx')).toEqual([]);
  });
});
