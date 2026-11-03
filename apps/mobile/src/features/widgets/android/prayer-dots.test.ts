import { prayerDotState, PRAYER_DOT_ORDER, prayerDots, prayerSmallTop } from './prayer-dots';
import { widgetContext } from './context';
import { fullSnapshot } from '../snapshot/test-fixtures';
import { ofKind, styleOf, walk } from './test-tree';

const now = new Date(2026, 10, 2, 12, 0);
const ctx = widgetContext({ mode: 'light', now, scheme: 'taybah', snapshot: fullSnapshot({ locale: 'en' }) });

describe('prayerDotState', () => {
  it('marks the next key, past instants and future keys', () => {
    const nowMs = now.getTime();
    expect(prayerDotState('asr', 'asr', undefined, nowMs)).toBe('next');
    expect(prayerDotState('fajr', 'asr', nowMs - 60_000, nowMs)).toBe('past');
    expect(prayerDotState('maghrib', 'asr', nowMs + 60_000, nowMs)).toBe('future');
  });
});

describe('prayerDots', () => {
  it('renders five dot widgets in prayer order', () => {
    const tree = prayerDots(ctx, 'asr');
    const dots = walk(tree).filter((node) => {
      const style = styleOf(node);
      return style.width === 8 && style.height === 8;
    });
    expect(dots).toHaveLength(PRAYER_DOT_ORDER.length);
  });

  it('fills the next prayer dot with brand', () => {
    const tree = prayerDots(ctx, 'asr');
    const brandDots = walk(tree).filter((node) => styleOf(node).backgroundColor === ctx.palette.brand);
    expect(brandDots).toHaveLength(1);
  });

  it('wraps dots in a horizontal row', () => {
    const tree = prayerDots(ctx, 'asr');
    // Library FlexWidget compiles to LinearLayoutWidget in the element tree.
    expect(ofKind(tree, 'LinearLayoutWidget').some((node) => styleOf(node).flexDirection === 'row')).toBe(true);
  });
});

describe('prayerSmallTop', () => {
  it('end-aligns the chip stack in Arabic', () => {
    const arCtx = widgetContext({ mode: 'light', now, scheme: 'taybah', snapshot: fullSnapshot({ locale: 'ar' }) });
    const tree = prayerSmallTop(arCtx, 'LABEL nextPrayer', 'PRAYER asr', '12:00');
    expect(ofKind(tree, 'LinearLayoutWidget').some((node) => styleOf(node).alignItems === 'flex-end')).toBe(true);
  });
});
