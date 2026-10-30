import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { themes } from '@/core/theme';

import { RecentListenRowSkeleton } from './RecentListenRowSkeleton';

const hidden = { includeHiddenElements: true } as const;
const colors = themes.light.colors;

describe('RecentListenRowSkeleton', () => {
  it('draws the 48 pt tile with a 14 pt radius', async () => {
    const view = await renderUi(<RecentListenRowSkeleton nameWidth="56%" testID="row" />);

    expect(flatStyle(view.getByTestId('row-tile', hidden).props.style)).toMatchObject({ borderRadius: 14, height: 48, width: 48 });
  });

  it.each(['56%', '64%'] as const)('sets the name bar to %s wide over a 40%% subtitle bar', async (nameWidth) => {
    const view = await renderUi(<RecentListenRowSkeleton nameWidth={nameWidth} testID="row" />);

    expect(flatStyle(view.getByTestId('row-name', hidden).props.style)).toMatchObject({ height: 12, width: nameWidth });
    expect(flatStyle(view.getByTestId('row-subtitle', hidden).props.style)).toMatchObject({ height: 10, width: '40%' });
  });

  it('draws the 44 pt play button place in surfaceRaised with a line border', async () => {
    const view = await renderUi(<RecentListenRowSkeleton nameWidth="56%" testID="row" />);

    const control = view.getByTestId('row-control', hidden);
    const fill = control.children[0] as unknown as { props: { style: unknown } };

    expect(flatStyle(fill.props.style)).toMatchObject({ backgroundColor: colors.surfaceRaised });
    expect(flatStyle(control.props.style)).toMatchObject({
      borderColor: colors.line,
      borderRadius: 22,
      height: 44,
      width: 44,
    });
  });

  it.each(locales)('is hidden from screen readers in %s', async (locale) => {
    const view = await renderUi(<RecentListenRowSkeleton nameWidth="56%" testID="row" />, { locale });

    expect(view.getByTestId('row-name', hidden).props.accessibilityElementsHidden).toBe(true);
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/home/components/RecentListenRowSkeleton.tsx')).toEqual([]);
  });
});
