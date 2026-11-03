import { NextPrayerWidget } from './NextPrayerWidget';
import { widgetContext } from './context';
import { fullSnapshot } from '../snapshot/test-fixtures';
import { formatPlaybackClock, prayerClock } from '@/core/i18n/clock';
import { cardRootFill, hasArabicIndicNumerals, startAlignedFullWidthLabels, styleOf, textsOf, walk } from './test-tree';

const now = new Date(2026, 10, 2, 12, 0);
const ctx = (locale: 'ar' | 'en' = 'en', mode: 'light' | 'dark' = 'light', snapshot = fullSnapshot({ locale })) =>
  widgetContext({ mode, now, scheme: 'taybah', snapshot });

function textStyle(tree: ReturnType<typeof NextPrayerWidget>, text: string) {
  const element = walk(tree).find((node) => node.props.text === text);
  expect(element).toBeDefined();
  return styleOf(element!);
}

describe('NextPrayerWidget', () => {
  it('shows the next prayer name, time chip, dots, remaining band and duration from the snapshot', () => {
    const context = ctx();
    const tree = NextPrayerWidget(context);
    const snapshot = fullSnapshot();
    const stateAt = snapshot.prayer.entries.find((entry) => entry.at > now.getTime())!;
    const remaining = formatPlaybackClock(stateAt.at - now.getTime(), 'en');

    expect(textsOf(tree)).toEqual(
      expect.arrayContaining(['PRAYER asr', 'LABEL nextPrayer', 'LABEL remaining', remaining]),
    );
    expect(textsOf(tree)).not.toContain('PLACE');

    const dots = walk(tree).filter((node) => {
      const style = styleOf(node);
      return style.width === 8 && style.height === 8;
    });
    expect(dots).toHaveLength(5);
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

  it('uses semibold ink in the time chip and onBrandSurface for remaining numerals', () => {
    const context = ctx('en', 'light');
    const tree = NextPrayerWidget(context);
    const snapshot = fullSnapshot();
    const stateAt = snapshot.prayer.entries.find((entry) => entry.at > now.getTime())!;
    const time = prayerClock(new Date(stateAt.at), 'en');
    const remaining = formatPlaybackClock(stateAt.at - now.getTime(), 'en');
    const { palette } = context;

    expect(textStyle(tree, time).color).toBe(palette.ink);
    expect(textStyle(tree, remaining).color).toBe(palette.onBrandSurface);
  });

  it('distributes the face with space-between and start-aligned labels in Arabic and English', () => {
    for (const locale of ['ar', 'en'] as const) {
      const tree = NextPrayerWidget(ctx(locale));
      const body = walk(tree).find((node) => styleOf(node).justifyContent === 'space-between');
      expect(body).toBeDefined();
      expect(startAlignedFullWidthLabels(tree, locale === 'ar')).toBe(true);
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
    expect(cardRootFill(NextPrayerWidget(ctx('en', 'light')))).not.toBe(cardRootFill(NextPrayerWidget(ctx('en', 'dark'))));
  });

  it('start-aligns the prayer chip column in Arabic', () => {
    const tree = NextPrayerWidget(ctx('ar'));
    const chipColumn = walk(tree).find(
      (node) =>
        styleOf(node).flexDirection === 'column' &&
        styleOf(node).alignItems === 'flex-end' &&
        walk(node).some((child) => styleOf(child).borderRadius !== undefined && styleOf(child).backgroundColor),
    );
    expect(chipColumn).toBeDefined();
  });

  it('uses Arabic-Indic digits in the prayer time and remaining in Arabic', () => {
    expect(hasArabicIndicNumerals(NextPrayerWidget(ctx('ar')))).toBe(true);
  });
});
