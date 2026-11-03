import { ProgressWidget } from './ProgressWidget';
import { widgetContext } from './context';
import { fullSnapshot } from '../snapshot/test-fixtures';
import { cardRootFill, hasArabicIndicNumerals, ofKind, startAlignedFullWidthLabels, styleOf, textsOf } from './test-tree';

const now = new Date(2026, 10, 2, 12, 0);
const ctx = (
  locale: 'ar' | 'en' = 'en',
  mode: 'light' | 'dark' = 'light',
  snapshot = fullSnapshot({ locale }),
) => widgetContext({ mode, now, scheme: 'taybah', snapshot });

describe('ProgressWidget', () => {
  it('shows the percent in the ring and each chosen goal row', () => {
    const texts = textsOf(ProgressWidget(ctx()));
    expect(texts).toEqual(expect.arrayContaining(['60%', 'ROW wird', 'VALUE 4 of 10', 'ROW misbaha', '✓']));
  });

  it('asks the user to choose goals when none are chosen', () => {
    const snapshot = fullSnapshot({ progress: { percent: 0, rows: [] } });
    expect(textsOf(ProgressWidget(ctx('en', 'light', snapshot)))).toContain('LABEL progressEmpty');
  });

  it('draws the ring as an SVG', () => {
    const svgs = ofKind(ProgressWidget(ctx()), 'SvgWidget');
    // Card motif watermark + progress ring.
    expect(svgs.length).toBeGreaterThanOrEqual(1);
    expect(svgs.some((node) => styleOf(node).width === 92)).toBe(true);
  });

  it('uses a scrollable list when goal rows exist', () => {
    expect(ofKind(ProgressWidget(ctx()), 'ListWidget')).toHaveLength(1);
  });

  it('opens the goals screen on tap', () => {
    const root = ProgressWidget(ctx()) as { props: Record<string, unknown> };
    expect(root.props.clickActionData).toEqual({ uri: 'taybah://daily-goals' });
  });

  it('uses Arabic-Indic digits and the Arabic percent sign in Arabic', () => {
    const tree = ProgressWidget(ctx('ar'));
    expect(hasArabicIndicNumerals(tree)).toBe(true);
    expect(textsOf(tree).some((text) => text.includes('٪'))).toBe(true);
  });

  it('right-aligns full-width labels in Arabic', () => {
    expect(startAlignedFullWidthLabels(ProgressWidget(ctx('ar')), true)).toBe(true);
  });

  it('uses the dark palette in dark mode', () => {
    expect(cardRootFill(ProgressWidget(ctx('en', 'light')))).not.toBe(cardRootFill(ProgressWidget(ctx('en', 'dark'))));
  });
});
