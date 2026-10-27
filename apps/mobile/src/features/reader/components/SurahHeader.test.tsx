import { openReaderTestContent } from '../../../../jest/reader-test-db';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { formatNumber } from '@/core/i18n';

import { locales, renderUi } from '../../../../jest/render-ui';
import { getChapter } from '../data/chapters';
import { SurahHeader } from './SurahHeader';

describe('SurahHeader', () => {
  it.each(locales)('shows the cartouche, revelation place and ayah count (%s)', async (locale) => {
    const { executor } = await openReaderTestContent();
    const chapter = getChapter(executor, 2);
    expect(chapter).toBeDefined();

    const view = await renderUi(<SurahHeader chapter={chapter!} testID="header" />, { locale });
    expect(view.getByRole('header')).toBeOnTheScreen();
    expect(view.getByTestId('header-cartouche')).toBeOnTheScreen();
    expect(view.getByText(chapter!.nameArabic)).toBeOnTheScreen();
    expect(view.getByText(new RegExp(formatNumber(chapter!.versesCount, locale)))).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/components/SurahHeader.tsx')).toEqual([]);
  });
});
