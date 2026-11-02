import { NextPrayerWideWidget } from './NextPrayerWideWidget';
import { widgetContext } from './context';
import { fullSnapshot } from '../snapshot/test-fixtures';
import { textsOf } from './test-tree';

const now = new Date(2026, 10, 2, 12, 0);
const ctx = (locale: 'ar' | 'en') =>
  widgetContext({ mode: 'light', now, scheme: 'taybah', snapshot: fullSnapshot({ locale }) });

describe('NextPrayerWideWidget', () => {
  // The first prayer text is the header's name; the five tiles follow it in time order.
  const tilesOf = (texts: string[]) => texts.filter((text) => text.startsWith('PRAYER ')).slice(1);

  it('lists the five times of the day in time order for English', () => {
    const texts = textsOf(NextPrayerWideWidget(ctx('en')));
    expect(tilesOf(texts)).toEqual(['PRAYER fajr', 'PRAYER dhuhr', 'PRAYER asr', 'PRAYER maghrib', 'PRAYER isha']);
  });

  it('writes the first prayer last in Arabic so it sits on the right', () => {
    const texts = textsOf(NextPrayerWideWidget(ctx('ar')));
    expect(tilesOf(texts)).toEqual(['PRAYER isha', 'PRAYER maghrib', 'PRAYER asr', 'PRAYER dhuhr', 'PRAYER fajr']);
  });

  it('shows the stale state without the times', () => {
    const late = widgetContext({ mode: 'light', now: new Date(2026, 11, 20), scheme: 'taybah', snapshot: fullSnapshot() });
    expect(textsOf(NextPrayerWideWidget(late))).toEqual(['LABEL nextPrayer', 'LABEL stale']);
  });
});
