import { MisbahaWidget } from './MisbahaWidget';
import { widgetContext } from './context';
import { MISBAHA_TAP_ACTION } from './names';
import { fullSnapshot } from '../snapshot/test-fixtures';
import { hasArabicIndicNumerals, ofKind, startAlignedFullWidthLabels, styleOf, textsOf } from './test-tree';

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
    const plus = ofKind(MisbahaWidget(ctx()), 'LinearLayoutWidget').find((el) => el.props.clickAction === MISBAHA_TAP_ACTION);
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

  it('uses the dark palette in dark mode', () => {
    const light = styleOf(ofKind(MisbahaWidget(ctx('en', 'light')), 'LinearLayoutWidget')[0]!);
    const dark = styleOf(ofKind(MisbahaWidget(ctx('en', 'dark')), 'LinearLayoutWidget')[0]!);
    expect(light.backgroundColor).not.toBe(dark.backgroundColor);
  });
});
