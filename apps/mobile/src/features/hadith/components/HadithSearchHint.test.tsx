import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { themes } from '@/core/theme';

import { HadithSearchHint } from './HadithSearchHint';

describe('HadithSearchHint', () => {
  it.each(locales)('renders in Arabic and English (%s)', async (locale) => {
    await renderUi(<HadithSearchHint />, { locale });
    expect(screen.getByTestId('hadith-search-hint')).toHaveTextContent(
      locale === 'ar' ? 'البحث يتجاهل التشكيل والهمزات.' : 'Search ignores diacritics and hamza forms.',
    );
  });

  it('is muted caption text', async () => {
    await renderUi(<HadithSearchHint />);
    const style = flatStyle(screen.getByTestId('hadith-search-hint').props.style);
    expect(style.color).toBe(themes.light.colors.inkMuted);
    expect(style.fontSize).toBe(13);
    expect(style.lineHeight).toBe(18);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/hadith/components/HadithSearchHint.tsx')).toEqual([]);
  });
});
