import { highContrast } from '@quran/design-tokens';
import { AccessibilityInfo } from 'react-native';

import { themes } from '@/core/theme';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { TranslationBlock } from './TranslationBlock';

const colors = themes.light.colors;

const english = {
  meta: { authorName: 'Saheeh International', direction: 'ltr', name: 'Sahih International', resourceId: 20 },
  resourceId: 20,
  text: 'In the name of Allah',
} as const;

const urdu = {
  meta: { authorName: null, direction: 'rtl', name: 'Jalandhry', resourceId: 54 },
  resourceId: 54,
  text: 'شروع الله کا نام لے کر',
} as const;

describe('TranslationBlock', () => {
  it.each(locales)('lays a left-to-right translation out in its own direction in %s', async (locale) => {
    const view = await renderUi(<TranslationBlock block={english} testID="block" />, { locale });

    expect(view.getByTestId('block')).toBeOnTheScreen();
    expect(flatStyle(view.getByText(english.text).props.style)).toMatchObject({
      color: colors.inkMuted,
      fontSize: themes.light.text.subhead.fontSize,
      textAlign: 'left',
      writingDirection: 'ltr',
    });
  });

  it.each(locales)('lays a right-to-left translation out in its own direction in %s', async (locale) => {
    const view = await renderUi(<TranslationBlock block={urdu} />, { locale });

    expect(flatStyle(view.getByText(urdu.text).props.style)).toMatchObject({ textAlign: 'right', writingDirection: 'rtl' });
  });

  it('credits the author when there is one, and the translation alone otherwise', async () => {
    const withAuthor = await renderUi(<TranslationBlock block={english} />, { locale: 'en' });
    const attribution = withAuthor.getByText(/Saheeh International/);
    expect(attribution).toHaveTextContent(/Sahih International/);
    expect(flatStyle(attribution.props.style)).toMatchObject({
      color: colors.inkMuted,
      fontSize: themes.light.text.caption.fontSize,
    });

    const withoutAuthor = await renderUi(<TranslationBlock block={urdu} />, { locale: 'en' });
    expect(withoutAuthor.getByText(/Jalandhry/)).toBeOnTheScreen();
  });

  it('reads as plain text, following the system text size', async () => {
    const view = await renderUi(<TranslationBlock block={english} />);

    const text = view.getByText(english.text);
    expect(text.props.accessibilityRole).toBeUndefined();
    expect(text.props.allowFontScaling).not.toBe(false);
    expect(text.props.dynamicTypeRamp).toBe('subheadline');
  });

  it('uses the Increase Contrast muted ink when the system asks for it', async () => {
    const spy = jest.spyOn(AccessibilityInfo, 'isDarkerSystemColorsEnabled').mockResolvedValue(true);
    const view = await renderUi(<TranslationBlock block={english} />);

    expect(await view.findByText(english.text)).toHaveStyle({ color: highContrast.light.inkMuted });
    spy.mockRestore();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/reader/components/TranslationBlock.tsx')).toEqual([]);
  });
});
