import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { themes } from '@/core/theme';

import { SourceLine } from './SourceLine';

describe('SourceLine', () => {
  it('credits the book, the author, the page and the edition (ar)', async () => {
    await renderUi(<SourceLine page={123} />);
    expect(screen.getByText('المصدر: «نور اليقين في سيرة سيد المرسلين»، محمد الخضري بك · ص ١٢٣ · نسخة OpenITI')).toBeOnTheScreen();
  });

  it('keeps the Arabic title in the English credit and uses Western digits', async () => {
    await renderUi(<SourceLine page={123} />, { locale: 'en' });
    expect(screen.getByText('Source: «نور اليقين في سيرة سيد المرسلين», Muhammad al-Khudari · p. 123 · OpenITI edition')).toBeOnTheScreen();
  });

  it.each(locales)('drops the page when there is none (%s)', async (locale) => {
    await renderUi(<SourceLine page={null} />, { locale });
    expect(screen.getByTestId('seerah-source-line')).toBeOnTheScreen();
    expect(screen.queryByText(/123/)).toBeNull();
    expect(screen.getByText(/OpenITI/)).toBeOnTheScreen();
  });

  it('is muted caption text and scales', async () => {
    await renderUi(<SourceLine page={1} />);
    const text = screen.getByText(/OpenITI/);
    expect(flatStyle(text.props.style).color).toBe(themes.light.colors.inkMuted);
    expect(text.props.maxFontSizeMultiplier).toBe(2);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/SourceLine.tsx')).toEqual([]);
  });
});
