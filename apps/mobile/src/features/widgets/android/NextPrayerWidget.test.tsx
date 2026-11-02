import { NextPrayerWidget } from './NextPrayerWidget';
import { widgetContext } from './context';
import { fullSnapshot } from '../snapshot/test-fixtures';
import { ofKind, styleOf, textsOf } from './test-tree';

const now = new Date(2026, 10, 2, 12, 0);
const ctx = (locale: 'ar' | 'en' = 'en', mode: 'light' | 'dark' = 'light', snapshot = fullSnapshot({ locale })) =>
  widgetContext({ mode, now, scheme: 'taybah', snapshot });

describe('NextPrayerWidget', () => {
  it('shows the next prayer name and its time from the snapshot', () => {
    const tree = NextPrayerWidget(ctx());
    expect(textsOf(tree)).toEqual(expect.arrayContaining(['PRAYER asr', 'LABEL nextPrayer', 'PLACE']));
  });

  it('opens the prayer screen on tap and labels the card for TalkBack', () => {
    const root = NextPrayerWidget(ctx()) as { props: Record<string, unknown> };
    expect(root.props.clickAction).toBe('OPEN_URI');
    expect(root.props.clickActionData).toEqual({ uri: 'taybah://salah' });
    expect(root.props.accessibilityLabel).toMatch(/^LABEL nextPrayer: PRAYER asr /);
  });

  it('shows the stale state and no time once every stored instant has passed', () => {
    const late = new Date(2026, 11, 20, 12, 0);
    const tree = NextPrayerWidget({ ...ctx(), now: late });
    expect(textsOf(tree)).toEqual(['LABEL nextPrayer', 'LABEL stale']);
  });

  it('asks for a location when the snapshot has no instants', () => {
    const snapshot = fullSnapshot({ prayer: { entries: [], place: null, validUntil: null } });
    expect(textsOf(NextPrayerWidget(ctx('en', 'light', snapshot)))).toContain('LABEL noLocation');
  });

  it('uses the dark palette in dark mode', () => {
    const light = styleOf(ofKind(NextPrayerWidget(ctx('en', 'light')), 'LinearLayoutWidget')[0]!);
    const dark = styleOf(ofKind(NextPrayerWidget(ctx('en', 'dark')), 'LinearLayoutWidget')[0]!);
    expect(light.backgroundColor).not.toBe(dark.backgroundColor);
  });
});
