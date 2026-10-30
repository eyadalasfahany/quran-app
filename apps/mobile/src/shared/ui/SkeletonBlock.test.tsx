import { setUpTests } from 'react-native-reanimated';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { SkeletonBlock } from './SkeletonBlock';

setUpTests();

const hidden = { includeHiddenElements: true } as const;
const colors = themes.light.colors;

describe('SkeletonBlock', () => {
  it('draws a fillSecondary bar at its width and height, radius half its height', async () => {
    const view = await renderUi(<SkeletonBlock height={10} testID="bar" width={120} />);

    expect(flatStyle(view.getByTestId('bar', hidden).props.style)).toMatchObject({ borderRadius: 5, height: 10, width: 120 });
  });

  it('fills the bar with fillSecondary by default', async () => {
    const view = await renderUi(<SkeletonBlock height={10} testID="bar" width={120} />);
    const fill = view.getByTestId('bar', hidden).children[0] as unknown as { props: { style: unknown } };

    expect(flatStyle(fill.props.style)).toMatchObject({ backgroundColor: colors.fillSecondary, opacity: 1 });
  });

  it('takes an explicit radius over half the height', async () => {
    const view = await renderUi(<SkeletonBlock height={26} radius={8} testID="bar" width={160} />);

    expect(flatStyle(view.getByTestId('bar', hidden).props.style).borderRadius).toBe(8);
  });

  it('accepts a percentage width', async () => {
    const view = await renderUi(<SkeletonBlock height={12} testID="bar" width="62%" />);

    expect(flatStyle(view.getByTestId('bar', hidden).props.style).width).toBe('62%');
  });

  it('draws the brand card bar in onBrand at 20%, the card track colour', async () => {
    const view = await renderUi(<SkeletonBlock height={10} testID="bar" tone="onBrand" width={80} />);
    const fill = view.getByTestId('bar', hidden).children[0] as unknown as { props: { style: unknown } };

    expect(flatStyle(fill.props.style)).toMatchObject({ backgroundColor: colors.onBrandSurface, opacity: 0.2 });
  });

  it('draws a raised placeholder for a round button: surfaceRaised with a line hairline', async () => {
    const view = await renderUi(<SkeletonBlock height={44} testID="bar" tone="raised" width={44} />);
    const fill = view.getByTestId('bar', hidden).children[0] as unknown as { props: { style: unknown } };

    expect(flatStyle(view.getByTestId('bar', hidden).props.style)).toMatchObject({ borderColor: colors.line, borderRadius: 22 });
    expect(flatStyle(fill.props.style)).toMatchObject({ backgroundColor: colors.surfaceRaised });
  });

  it('stays at full opacity outside a SkeletonGroup', async () => {
    const view = await renderUi(<SkeletonBlock height={10} testID="bar" width={80} />);

    expect(view.getByTestId('bar', hidden)).toHaveAnimatedStyle({ opacity: 1 });
  });

  it('is hidden from screen readers; its group carries the label', async () => {
    const view = await renderUi(<SkeletonBlock height={10} testID="bar" width={80} />);

    expect(view.getByTestId('bar', hidden).props.accessibilityElementsHidden).toBe(true);
    expect(view.queryByRole('progressbar')).toBeNull();
  });

  it.each(locales)('lays the same bar out in %s, with no text to mirror', async (locale) => {
    const view = await renderUi(<SkeletonBlock height={12} testID="bar" width="34%" />, { locale });

    expect(flatStyle(view.getByTestId('bar', hidden).props.style)).toMatchObject({ height: 12, width: '34%' });
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('SkeletonBlock.tsx')).toEqual([]);
  });
});
