import { fireEvent } from '@testing-library/react-native';

import { i18n } from '@/core/i18n';
import { themes } from '@/core/theme';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { FocusAyah } from './FocusAyah';

const ayah = {
  textImlaei: 'إياك نعبد وإياك نستعين',
  textUthmani: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
  verseNumber: 5,
} as const;

describe('FocusAyah', () => {
  it.each(locales)('centres the ayah exactly as stored in its Quran font (%s)', async (locale) => {
    const view = await renderUi(<FocusAyah {...ayah} testID="focus" />, { locale });

    const text = view.getByTestId('focus-current');
    expect(text.props.children).toBe(ayah.textUthmani);
    expect(text.props.allowFontScaling).toBe(false);
    expect(flatStyle(text.props.style)).toMatchObject({
      color: themes.light.colors.ink,
      fontSize: 38,
      lineHeight: 80,
      textAlign: 'center',
      writingDirection: 'rtl',
    });
  });

  it('follows the reader font scale', async () => {
    const view = await renderUi(<FocusAyah {...ayah} fontScale={1.5} testID="focus" />);

    expect(flatStyle(view.getByTestId('focus-current').props.style)).toMatchObject({ fontSize: 57, lineHeight: 120 });
  });

  it('draws the active Focus marker at its size', async () => {
    const view = await renderUi(<FocusAyah {...ayah} testID="focus" />);
    const [mark] = view.getByTestId('focus-marker').children;

    expect(flatStyle(typeof mark === 'object' ? mark.props.style : undefined)).toMatchObject({
      color: themes.light.colors.brand,
      fontSize: themes.light.size.focusMarker,
    });
  });

  it.each(locales)('labels the ayah with its Imla\'i text and number (%s)', async (locale) => {
    const view = await renderUi(<FocusAyah {...ayah} testID="focus" />, { locale });

    const label = locale === 'ar' ? 'إياك نعبد وإياك نستعين الآية ٥' : 'إياك نعبد وإياك نستعين Ayah 5';
    expect(view.getByLabelText(label).props.accessibilityRole).toBe('text');
  });

  it('fills the ayah text with the reader highlight and names its colour in the label', async () => {
    const view = await renderUi(<FocusAyah {...ayah} highlightColor="blue" testID="focus" />);

    expect(flatStyle(view.getByTestId('focus-current').props.style).backgroundColor).toBe(
      themes.light.colors.highlightBlue,
    );
    expect(view.getByLabelText(`${ayah.textImlaei} ${i18n.t('ui.ayahNumber', { number: '٥' })} ${i18n.t('ui.highlight.blue')}`)).toBeOnTheScreen();
  });

  it('leaves the ayah text unfilled without a highlight', async () => {
    const view = await renderUi(<FocusAyah {...ayah} testID="focus" />);

    expect(flatStyle(view.getByTestId('focus-current').props.style).backgroundColor).toBeUndefined();
  });

  it('opens ayah actions from the marker', async () => {
    const onOpenActions = jest.fn();
    const view = await renderUi(<FocusAyah {...ayah} onOpenActions={onOpenActions} testID="focus" />);

    const marker = view.getByTestId('focus-marker');
    expect(marker.props.accessibilityRole).toBe('button');
    await fireEvent.press(marker);
    expect(onOpenActions).toHaveBeenCalledTimes(1);
  });

  it('leaves the marker as plain text without an actions handler', async () => {
    const view = await renderUi(<FocusAyah {...ayah} testID="focus" />);

    expect(view.getByTestId('focus-marker').props.accessibilityRole).toBe('text');
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/reader/components/FocusAyah.tsx')).toEqual([]);
  });
});
