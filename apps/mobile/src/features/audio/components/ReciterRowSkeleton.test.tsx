import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { themes } from '@/core/theme';

import { ReciterRowSkeleton } from './ReciterRowSkeleton';

const hidden = { includeHiddenElements: true } as const;
const colors = themes.light.colors;

describe('ReciterRowSkeleton', () => {
  it('keeps the reciter row’s 66 pt minimum height, gaps and bottom hairline', async () => {
    const view = await renderUi(<ReciterRowSkeleton nameWidth="62%" testID="row" />);

    expect(flatStyle(view.getByTestId('row', hidden).props.style)).toMatchObject({
      borderBottomColor: colors.line,
      borderBottomWidth: 1,
      flexDirection: 'row',
      gap: 12,
      minHeight: 66,
    });
  });

  it('draws the 46 pt tile with a 14 pt radius', async () => {
    const view = await renderUi(<ReciterRowSkeleton nameWidth="62%" testID="row" />);

    expect(flatStyle(view.getByTestId('row-tile', hidden).props.style)).toMatchObject({ borderRadius: 14, height: 46, width: 46 });
  });

  it.each(['62%', '48%', '70%'] as const)('sets the name bar to %s wide, 12 high, over a 34%% by 10 tag bar', async (nameWidth) => {
    const view = await renderUi(<ReciterRowSkeleton nameWidth={nameWidth} testID="row" />);

    expect(flatStyle(view.getByTestId('row-name', hidden).props.style)).toMatchObject({ height: 12, width: nameWidth });
    expect(flatStyle(view.getByTestId('row-tag', hidden).props.style)).toMatchObject({ height: 10, width: '34%' });
  });

  it('draws the 44 pt control in surfaceRaised with a line hairline, and keeps a 44 pt spacer for the options button', async () => {
    const view = await renderUi(<ReciterRowSkeleton nameWidth="62%" testID="row" />);

    const control = view.getByTestId('row-control', hidden);
    const fill = control.children[0] as unknown as { props: { style: unknown } };

    expect(flatStyle(fill.props.style)).toMatchObject({ backgroundColor: colors.surfaceRaised });
    expect(flatStyle(control.props.style)).toMatchObject({
      borderColor: colors.line,
      borderRadius: 22,
      borderWidth: 1,
      height: 44,
      width: 44,
    });
    expect(flatStyle(view.getByTestId('row-spacer', hidden).props.style).width).toBe(44);
  });

  it.each(locales)('is hidden from screen readers in %s', async (locale) => {
    const view = await renderUi(<ReciterRowSkeleton nameWidth="62%" testID="row" />, { locale });

    expect(view.getByTestId('row-name', hidden).props.accessibilityElementsHidden).toBe(true);
    expect(view.queryByRole('button')).toBeNull();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/audio/components/ReciterRowSkeleton.tsx')).toEqual([]);
  });
});
