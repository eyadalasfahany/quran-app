import { themes } from '@/core/theme';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { FocusAside } from './FocusAside';

describe('FocusAside', () => {
  it.each(locales)('draws the neighbouring ayah dimmed and centred in %s', async (locale) => {
    const view = await renderUi(
      <FocusAside testID="aside" textUthmani="مَـٰلِكِ يَوْمِ ٱلدِّينِ" verseNumber={4} />,
      { locale },
    );
    const text = view.getByTestId('aside', { includeHiddenElements: true });

    expect(text).toHaveTextContent('مَـٰلِكِ يَوْمِ ٱلدِّينِ ﴿٤﴾');
    expect(text.props.allowFontScaling).toBe(false);
    expect(flatStyle(text.props.style)).toMatchObject({
      color: themes.light.colors.ink,
      fontSize: 24,
      lineHeight: 48,
      opacity: themes.light.opacity.focusAside,
      textAlign: 'center',
      writingDirection: 'rtl',
    });
  });

  it('follows the reader font scale', async () => {
    const view = await renderUi(
      <FocusAside fontScale={1.5} testID="aside" textUthmani="مَـٰلِكِ يَوْمِ ٱلدِّينِ" verseNumber={4} />,
    );

    expect(flatStyle(view.getByTestId('aside', { includeHiddenElements: true }).props.style)).toMatchObject({
      fontSize: 36,
      lineHeight: 72,
    });
  });

  it('stays out of the screen reader order, which reads only the current ayah', async () => {
    const view = await renderUi(<FocusAside testID="aside" textUthmani="مَـٰلِكِ يَوْمِ ٱلدِّينِ" verseNumber={4} />);

    expect(view.queryByTestId('aside')).toBeNull();
    const text = view.getByTestId('aside', { includeHiddenElements: true });
    expect(text.props.accessibilityElementsHidden).toBe(true);
    expect(text.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/components/FocusAside.tsx')).toEqual([]);
  });
});
