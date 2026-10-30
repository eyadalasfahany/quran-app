import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { themes } from '@/core/theme';

import { SurahRowSkeleton } from './SurahRowSkeleton';

const hidden = { includeHiddenElements: true } as const;
const colors = themes.light.colors;

describe('SurahRowSkeleton', () => {
  it('keeps the index row’s 60 pt minimum height, 14 pt gap and hairline', async () => {
    const view = await renderUi(<SurahRowSkeleton nameWidth="34%" testID="row" />);

    expect(flatStyle(view.getByTestId('row', hidden).props.style)).toMatchObject({
      borderBottomColor: colors.line,
      borderBottomWidth: 1,
      gap: 14,
      minHeight: 60,
    });
  });

  it('draws the gold medallion outline at 0.35 opacity by default', async () => {
    const view = await renderUi(<SurahRowSkeleton nameWidth="34%" testID="row" />);

    expect(flatStyle(view.getByTestId('row-medallion', hidden).props.style).opacity).toBe(0.35);
  });

  it('omits the medallion when medallion is false', async () => {
    const view = await renderUi(<SurahRowSkeleton medallion={false} nameWidth="34%" testID="row" />);

    expect(view.queryByTestId('row-medallion', hidden)).toBeNull();
  });

  it.each(['34%', '28%', '40%'] as const)('sets the name bar to %s wide at 14 high over a 30%% by 10 meta bar', async (nameWidth) => {
    const view = await renderUi(<SurahRowSkeleton nameWidth={nameWidth} testID="row" />);

    expect(flatStyle(view.getByTestId('row-name', hidden).props.style)).toMatchObject({ height: 14, width: nameWidth });
    expect(flatStyle(view.getByTestId('row-meta', hidden).props.style)).toMatchObject({ height: 10, width: '30%' });
  });

  it('ends with the 28 by 10 page bar', async () => {
    const view = await renderUi(<SurahRowSkeleton nameWidth="34%" testID="row" />);

    expect(flatStyle(view.getByTestId('row-page', hidden).props.style)).toMatchObject({ height: 10, width: 28 });
  });

  it.each(locales)('is hidden from screen readers in %s', async (locale) => {
    const view = await renderUi(<SurahRowSkeleton nameWidth="34%" testID="row" />, { locale });

    expect(view.getByTestId('row-name', hidden).props.accessibilityElementsHidden).toBe(true);
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/library/components/SurahRowSkeleton.tsx')).toEqual([]);
  });
});
