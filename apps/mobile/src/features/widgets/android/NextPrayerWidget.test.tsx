import { NextPrayerWidget } from './NextPrayerWidget';
import { widgetContext } from './context';
import { fullSnapshot } from '../snapshot/test-fixtures';
import { formatPlaybackClock, prayerClock } from '@/core/i18n/clock';
import { hasArabicIndicNumerals, ofKind, startAlignedFullWidthLabels, styleOf, textsOf, walk } from './test-tree';

const now = new Date(2026, 10, 2, 12, 0);
const ctx = (locale: 'ar' | 'en' = 'en', mode: 'light' | 'dark' = 'light', snapshot = fullSnapshot({ locale })) =>
  widgetContext({ mode, now, scheme: 'taybah', snapshot });

function textStyle(tree: ReturnType<typeof NextPrayerWidget>, text: string) {
  const element = walk(tree).find((node) => node.props.text === text);
  expect(element).toBeDefined();
  return styleOf(element!);
}

describe('NextPrayerWidget', () => {
  it('shows the next prayer name, muted clock, remaining label and duration from the snapshot', () => {
    const context = ctx();
    const tree = NextPrayerWidget(context);
    const snapshot = fullSnapshot();
    const stateAt = snapshot.prayer.entries.find((entry) => entry.at > now.getTime())!;
    const remaining = formatPlaybackClock(stateAt.at - now.getTime(), 'en');

    expect(textsOf(tree)).toEqual(
      expect.arrayContaining(['PRAYER asr', 'LABEL nextPrayer', 'LABEL remaining', remaining]),
    );
    expect(textsOf(tree)).not.toContain('PLACE');
  });

  it('opens the prayer screen on tap and labels the card for TalkBack', () => {
    const context = ctx();
    const snapshot = fullSnapshot();
    const stateAt = snapshot.prayer.entries.find((entry) => entry.at > now.getTime())!;
    const remaining = formatPlaybackClock(stateAt.at - now.getTime(), 'en');
    const root = NextPrayerWidget(context) as { props: Record<string, unknown> };
    expect(root.props.clickAction).toBe('OPEN_URI');
    expect(root.props.clickActionData).toEqual({ uri: 'taybah://salah' });
    const time = prayerClock(new Date(stateAt.at), 'en');
    expect(root.props.accessibilityLabel).toBe(`LABEL nextPrayer: PRAYER asr ${time}, LABEL remaining ${remaining}`);
  });

  it('uses a muted clock and brand remaining numerals', () => {
    const context = ctx('en', 'light');
    const tree = NextPrayerWidget(context);
    const snapshot = fullSnapshot();
    const stateAt = snapshot.prayer.entries.find((entry) => entry.at > now.getTime())!;
    const time = prayerClock(new Date(stateAt.at), 'en');
    const remaining = formatPlaybackClock(stateAt.at - now.getTime(), 'en');
    const { palette } = context;

    expect(textStyle(tree, time).color).toBe(palette.inkMuted);
    expect(textStyle(tree, remaining).color).toBe(palette.brand);
  });

  it('centres full-width labels in Arabic and English', () => {
    for (const locale of ['ar', 'en'] as const) {
      const tree = NextPrayerWidget(ctx(locale));
      expect(
        walk(tree)
          .filter((node) => typeof node.props.text === 'string' && styleOf(node).width === 'match_parent')
          .every((node) => styleOf(node).textAlign === 'center'),
      ).toBe(true);
    }
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

  it('uses Arabic-Indic digits in the prayer time and remaining in Arabic', () => {
    expect(hasArabicIndicNumerals(NextPrayerWidget(ctx('ar')))).toBe(true);
  });

  it('does not right-align start labels when every line is centred', () => {
    expect(startAlignedFullWidthLabels(NextPrayerWidget(ctx('ar')), true)).toBe(true);
  });
});
