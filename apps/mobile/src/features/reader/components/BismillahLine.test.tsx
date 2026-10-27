import { themes } from '@/core/theme';
import { quranText } from '@/shared/ui';

import { openReaderTestContent } from '../../../../jest/reader-test-db';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { getChapter } from '../data/chapters';
import { BismillahLine } from './BismillahLine';

describe('BismillahLine', () => {
  it('renders chapter bismillah text byte for byte in the Reading Quran style', async () => {
    const { executor } = await openReaderTestContent();
    const cow = getChapter(executor, 2);
    expect(cow?.bismillahText).toBeTruthy();

    const view = await renderUi(<BismillahLine text={cow!.bismillahText!} testID="bismillah" />);
    const text = view.getByText(cow!.bismillahText!);

    expect(text.props.children).toBe(cow!.bismillahText);
    expect(text.props.allowFontScaling).toBe(false);
    expect(flatStyle(text.props.style)).toMatchObject({
      color: themes.light.colors.ink,
      fontFamily: quranText('quranReading').fontFamily,
      fontSize: quranText('quranReading').fontSize,
    });
  });

  it('takes the Mushaf type size and the reader font scale', async () => {
    const view = await renderUi(<BismillahLine fontScale={1.4} text="بِسْمِ ٱللَّهِ" typeToken="quranMushaf" />);

    expect(flatStyle(view.getByText('بِسْمِ ٱللَّهِ').props.style)).toMatchObject({
      fontSize: quranText('quranMushaf', 1.4).fontSize,
      lineHeight: quranText('quranMushaf', 1.4).lineHeight,
    });
  });

  it('is read as one text element', async () => {
    const view = await renderUi(<BismillahLine text="بِسْمِ ٱللَّهِ" testID="bismillah" />);

    expect(view.getByTestId('bismillah').props.accessibilityRole).toBe('text');
  });

  it.each(locales)('centres Quran text (%s)', async (locale) => {
    const view = await renderUi(<BismillahLine text="بِسْمِ ٱللَّهِ" testID="bismillah" />, { locale });
    expect(flatStyle(view.getByText('بِسْمِ ٱللَّهِ').props.style)).toMatchObject({
      textAlign: 'center',
      writingDirection: 'rtl',
    });
  });

  it('uses theme tokens only', () => {
    expect(featureComponentLiterals('features/reader/components/BismillahLine.tsx')).toEqual([]);
  });
});
