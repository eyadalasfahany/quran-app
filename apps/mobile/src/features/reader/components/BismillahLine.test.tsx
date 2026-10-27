import { openReaderTestContent } from '../../../../jest/reader-test-db';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { getChapter } from '../data/chapters';
import { BismillahLine } from './BismillahLine';

describe('BismillahLine', () => {
  it('renders chapter bismillah text byte for byte', async () => {
    const { executor } = await openReaderTestContent();
    const cow = getChapter(executor, 2);
    expect(cow?.bismillahText).toBeTruthy();

    const view = await renderUi(<BismillahLine text={cow!.bismillahText!} testID="bismillah" />);
    expect(view.getByText(cow!.bismillahText!)).toBeOnTheScreen();
  });

  it.each(locales)('centres Quran text (%s)', async (locale) => {
    const view = await renderUi(<BismillahLine text="بِسْمِ ٱللَّهِ" testID="bismillah" />, { locale });
    expect(flatStyle(view.getByText('بِسْمِ ٱللَّهِ').props.style)).toMatchObject({
      textAlign: 'center',
      writingDirection: 'rtl',
    });
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/components/BismillahLine.tsx')).toEqual([]);
  });
});
