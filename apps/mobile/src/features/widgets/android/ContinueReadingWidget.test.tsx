import { ContinueReadingWidget } from './ContinueReadingWidget';
import { widgetContext } from './context';
import { fullSnapshot } from '../snapshot/test-fixtures';
import { cardRootFill, hasArabicIndicNumerals, startAlignedFullWidthLabels, textsOf } from './test-tree';

const now = new Date(2026, 10, 2, 12, 0);
const ctx = (
  locale: 'ar' | 'en' = 'en',
  mode: 'light' | 'dark' = 'light',
  snapshot = fullSnapshot({ locale }),
) => widgetContext({ mode, now, scheme: 'taybah', snapshot });

describe('ContinueReadingWidget', () => {
  it('shows the surah and the ayah and page, never ayah text', () => {
    const texts = textsOf(ContinueReadingWidget(ctx()));
    expect(texts).toEqual(expect.arrayContaining(['SURAH placeholder', 'LABEL ayah 255 · LABEL page 42']));
  });

  it('opens the verse on tap', () => {
    const root = ContinueReadingWidget(ctx()) as { props: Record<string, unknown> };
    expect(root.props.clickActionData).toEqual({ uri: 'taybah://read/2:255' });
  });

  it('shows the wird line only with an active plan', () => {
    expect(textsOf(ContinueReadingWidget(ctx()))).toContain('4 LABEL of 10');
    expect(textsOf(ContinueReadingWidget(ctx('en', 'light', fullSnapshot({ wird: null }))))).not.toContain('4 LABEL of 10');
  });

  it('opens the app when no reading place is stored', () => {
    const root = ContinueReadingWidget(ctx('en', 'light', fullSnapshot({ reading: null }))) as { props: Record<string, unknown> };
    expect(root.props.clickAction).toBe('OPEN_APP');
  });

  it('uses Arabic-Indic digits in Arabic', () => {
    expect(hasArabicIndicNumerals(ContinueReadingWidget(ctx('ar')))).toBe(true);
  });

  it('right-aligns full-width labels in Arabic', () => {
    expect(startAlignedFullWidthLabels(ContinueReadingWidget(ctx('ar')), true)).toBe(true);
  });

  it('uses brandSurface for the open-app card in light and dark modes', () => {
    const { palette } = ctx('en', 'light');
    const tree = (mode: 'light' | 'dark') =>
      ContinueReadingWidget(ctx('en', mode, fullSnapshot({ reading: null })));
    expect(cardRootFill(tree('light'))).toBe(palette.brandSurface);
    expect(cardRootFill(tree('dark'))).toBe(palette.brandSurface);
  });
});
