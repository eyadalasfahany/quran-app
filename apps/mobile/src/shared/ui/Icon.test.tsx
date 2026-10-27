import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { Icon } from './Icon';

const chevron = { ios: 'chevron.right', android: 'chevron_right' } as const;
const ink = themes.light.colors.ink;
// Icons are hidden from screen readers, so queries have to opt in to see them.
const hidden = { includeHiddenElements: true };

describe('Icon', () => {
  it('renders at the default 22 pt size', async () => {
    const view = await renderUi(<Icon color={ink} name={chevron} testID="icon" />);

    expect(flatStyle(view.getByTestId('icon', hidden).props.style)).toMatchObject({ height: 22, width: 22 });
  });

  it('takes a size', async () => {
    const view = await renderUi(<Icon color={ink} name={chevron} size={16} testID="icon" />);

    expect(flatStyle(view.getByTestId('icon', hidden).props.style)).toMatchObject({ height: 16, width: 16 });
  });

  it('is hidden from screen readers, since its control carries the label', async () => {
    const view = await renderUi(<Icon color={ink} name={chevron} testID="icon" />);
    const icon = view.getByTestId('icon', hidden);

    expect(icon.props.accessibilityElementsHidden).toBe(true);
    expect(icon.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it.each(locales)('flips a directional glyph only in RTL (%s)', async (locale) => {
    const view = await renderUi(<Icon color={ink} mirrorInRtl name={chevron} testID="icon" />, { locale });

    expect(flatStyle(view.getByTestId('icon', hidden).props.style).transform).toEqual(
      locale === 'ar' ? [{ scaleX: -1 }] : undefined,
    );
  });

  it.each(locales)('never flips a glyph that is not directional (%s)', async (locale) => {
    const view = await renderUi(<Icon color={ink} name={chevron} testID="icon" />, { locale });

    expect(flatStyle(view.getByTestId('icon', hidden).props.style).transform).toBeUndefined();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('Icon.tsx')).toEqual([]);
  });
});
