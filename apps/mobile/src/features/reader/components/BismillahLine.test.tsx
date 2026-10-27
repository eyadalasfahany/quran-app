import { themes } from '@/core/theme';
import { ORNATE_CLOSE, ORNATE_OPEN, quranText } from '@/shared/ui';

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
    const line = view.getByTestId('bismillah-text');

    expect(view.getByText(cow!.bismillahText!).props.children).toBe(cow!.bismillahText);
    expect(line.props.allowFontScaling).toBe(false);
    expect(flatStyle(line.props.style)).toMatchObject({
      color: themes.light.colors.ink,
      fontFamily: quranText('quranReading').fontFamily,
      fontSize: quranText('quranReading').fontSize,
    });
  });

  it('sets the text between gold ornate parentheses', async () => {
    const view = await renderUi(<BismillahLine text="بِسْمِ ٱللَّهِ" testID="bismillah" />);

    expect(flatStyle(view.getByText(ORNATE_OPEN).props.style)).toMatchObject({ color: themes.light.colors.gold });
    expect(flatStyle(view.getByText(ORNATE_CLOSE).props.style)).toMatchObject({ color: themes.light.colors.gold });
    expect(view.getByTestId('bismillah-text').props.children[0].props.children).toBe(ORNATE_OPEN);
    expect(view.getByTestId('bismillah-text').props.children.at(-1).props.children).toBe(ORNATE_CLOSE);
  });

  it('takes the Mushaf type size and the reader font scale', async () => {
    const view = await renderUi(
      <BismillahLine fontScale={1.4} testID="bismillah" text="بِسْمِ ٱللَّهِ" typeToken="quranMushaf" />,
    );

    expect(flatStyle(view.getByTestId('bismillah-text').props.style)).toMatchObject({
      fontSize: quranText('quranMushaf', 1.4).fontSize,
      lineHeight: quranText('quranMushaf', 1.4).lineHeight,
    });
  });

  it('is read as one text element, without the ornaments', async () => {
    const view = await renderUi(<BismillahLine text="بِسْمِ ٱللَّهِ" testID="bismillah" />);

    expect(view.getByTestId('bismillah').props.accessibilityRole).toBe('text');
    expect(view.getByTestId('bismillah-text').props.accessibilityLabel).toBe('بِسْمِ ٱللَّهِ');
  });

  it.each(locales)('centres Quran text (%s)', async (locale) => {
    const view = await renderUi(<BismillahLine text="بِسْمِ ٱللَّهِ" testID="bismillah" />, { locale });
    expect(flatStyle(view.getByTestId('bismillah-text').props.style)).toMatchObject({
      textAlign: 'center',
      writingDirection: 'rtl',
    });
  });

  it('uses theme tokens only', () => {
    expect(featureComponentLiterals('features/reader/components/BismillahLine.tsx')).toEqual([]);
  });
});
