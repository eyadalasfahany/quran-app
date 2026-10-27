import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { QuranText } from './QuranText';
import { quranText } from './textStyles';

const ayah = 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ';

describe('QuranText', () => {
  it('renders the text exactly as given, in its Quran style and ink', async () => {
    const view = await renderUi(<QuranText variant="quranReading">{ayah}</QuranText>);
    const text = view.getByText(ayah);

    expect(text.props.children).toBe(ayah);
    expect(flatStyle(text.props.style)).toMatchObject({ ...quranText('quranReading'), color: themes.light.colors.ink });
  });

  it('ignores the system text size and follows the reader setting', async () => {
    const view = await renderUi(
      <QuranText fontScale={1.2} variant="quranFocus">
        {ayah}
      </QuranText>,
    );
    const text = view.getByText(ayah);

    expect(text.props.allowFontScaling).toBe(false);
    expect(flatStyle(text.props.style).fontSize).toBeCloseTo(38 * 1.2);
  });

  it.each(locales)('keeps the right edge as the start and can centre (%s)', async (locale) => {
    const start = await renderUi(<QuranText variant="quranMushaf">{ayah}</QuranText>, { locale });
    expect(flatStyle(start.getByText(ayah).props.style)).toMatchObject({ textAlign: 'right', writingDirection: 'rtl' });

    const centred = await renderUi(
      <QuranText align="center" variant="quranMushaf">
        {ayah}
      </QuranText>,
      { locale },
    );
    expect(flatStyle(centred.getByText(ayah).props.style).textAlign).toBe('center');
  });

  it('passes an accessibility label and press handler through', async () => {
    const onPress = jest.fn();
    const view = await renderUi(
      <QuranText accessibilityLabel="الحمد لله رب العالمين الآية ٢" onPress={onPress} variant="quranReading">
        {ayah}
      </QuranText>,
    );

    expect(view.getByLabelText('الحمد لله رب العالمين الآية ٢')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('QuranText.tsx')).toEqual([]);
  });
});
