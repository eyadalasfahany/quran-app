import { MisbahaWidget } from './MisbahaWidget';
import { widgetContext } from './context';
import { MISBAHA_TAP_ACTION } from './names';
import { fullSnapshot } from '../snapshot/test-fixtures';
import { hasArabicIndicNumerals, startAlignedFullWidthLabels, styleOf, textsOf, walk } from './test-tree';

const now = new Date(2026, 10, 2, 12, 0);
const ctx = (
  locale: 'ar' | 'en' = 'en',
  mode: 'light' | 'dark' = 'light',
  snapshot = fullSnapshot({ locale }),
) => widgetContext({ mode, now, scheme: 'taybah', snapshot });

describe('MisbahaWidget', () => {
  it('shows the count against the target', () => {
    expect(textsOf(MisbahaWidget(ctx()))).toEqual(expect.arrayContaining(['33', 'LABEL of 100']));
  });

  it('has a plus that sends the tap action, separate from the card tap', () => {
    const plus = walk(MisbahaWidget(ctx())).find((el) => el.props.clickAction === MISBAHA_TAP_ACTION);
    expect(plus).toBeDefined();
    expect(plus?.props.accessibilityLabel).toBe('LABEL countAction');
  });

  it('opens the misbaha screen from the card', () => {
    const root = MisbahaWidget(ctx()) as { props: Record<string, unknown> };
    expect(root.props.clickActionData).toEqual({ uri: 'taybah://sibha' });
  });

  it('shows the no-target label when the target is off', () => {
    const snapshot = fullSnapshot({ misbaha: { count: 5, target: null, todayTotal: 5 } });
    expect(textsOf(MisbahaWidget(ctx('en', 'light', snapshot)))).toContain('LABEL misbahaNoTarget');
  });

  it('uses Arabic-Indic digits in Arabic', () => {
    expect(hasArabicIndicNumerals(MisbahaWidget(ctx('ar')))).toBe(true);
  });

  it('right-aligns full-width labels in Arabic', () => {
    expect(startAlignedFullWidthLabels(MisbahaWidget(ctx('ar')), true)).toBe(true);
  });

  it('uses the dark palette gold on the misbaha ring', () => {
    const lightCtx = ctx('en', 'light');
    const darkCtx = ctx('en', 'dark');
    const ringSvg = (tree: ReturnType<typeof MisbahaWidget>) =>
      walk(tree).find((node) => typeof node.props.svg === 'string' && styleOf(node).width === 76)?.props.svg as
        | string
        | undefined;
    expect(ringSvg(MisbahaWidget(lightCtx))).toContain(lightCtx.palette.gold.slice(1));
    expect(ringSvg(MisbahaWidget(darkCtx))).toContain(darkCtx.palette.gold.slice(1));
    expect(lightCtx.palette.gold).not.toBe(darkCtx.palette.gold);
  });

  it('draws the plus as a centred SVG on a cream disc with brandSurface stroke', () => {
    const { palette } = ctx();
    const plus = walk(MisbahaWidget(ctx())).find((el) => el.props.clickAction === MISBAHA_TAP_ACTION);
    expect(plus).toBeDefined();
    expect(styleOf(plus!).backgroundColor).toBe(palette.onBrandSurface);
    expect(walk(plus!).some((node) => typeof node.props.svg === 'string' && (node.props.svg as string).includes('path'))).toBe(
      true,
    );
  });

  it('places the plus beside the target band in one footer row', () => {
    const tree = MisbahaWidget(ctx());
    const plus = walk(tree).find((el) => el.props.clickAction === MISBAHA_TAP_ACTION);
    expect(plus).toBeDefined();
    const footerRow = walk(tree).find(
      (node) =>
        styleOf(node).flexDirection === 'row' &&
        walk(node).some((child) => child.props.clickAction === MISBAHA_TAP_ACTION),
    );
    expect(footerRow).toBeDefined();
  });
});
