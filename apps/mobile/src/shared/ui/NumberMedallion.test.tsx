import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { NumberMedallion } from './NumberMedallion';

const hidden = { includeHiddenElements: true } as const;

describe('NumberMedallion', () => {
  it.each(locales)('draws Arabic-Indic digits in Amiri in %s', async (locale) => {
    const view = await renderUi(<NumberMedallion number={114} testID="medallion" />, { locale });

    expect(flatStyle(view.getByText('١١٤', hidden).props.style)).toMatchObject({ fontFamily: 'Amiri-Regular', fontSize: 14 });
  });

  it('sets the number at round(14 × 1.758) = 25 and centres it in the star', async () => {
    const view = await renderUi(<NumberMedallion number={114} testID="medallion" />);

    expect(flatStyle(view.getByText('١١٤', hidden).props.style)).toMatchObject({ lineHeight: 25, textAlign: 'center' });
  });

  it('draws the gold eight-point star from two squares, one turned 45°', async () => {
    const view = await renderUi(<NumberMedallion number={1} testID="medallion" />);
    const medallion = view.getByTestId('medallion', hidden);
    const [square, turned] = medallion.children.filter((child) => typeof child === 'object');

    expect(flatStyle(medallion.props.style)).toMatchObject({ height: 38, width: 38 });
    expect(flatStyle(typeof square === 'object' ? square.props.style : undefined)).toMatchObject({
      borderColor: themes.light.colors.gold,
      height: 24,
      width: 24,
    });
    expect(flatStyle(typeof turned === 'object' ? turned.props.style : undefined).transform).toEqual([{ rotate: '45deg' }]);
  });

  it('is hidden from screen readers; its row carries the label', async () => {
    const view = await renderUi(<NumberMedallion number={1} testID="medallion" />);

    expect(view.getByTestId('medallion', hidden).props.accessibilityElementsHidden).toBe(true);
    expect(view.queryByText('١')).toBeNull();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('NumberMedallion.tsx')).toEqual([]);
  });
});
