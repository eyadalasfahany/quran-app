import { locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { formatPlaybackClock, prayerClock } from '@/core/i18n/clock';

import { fullSnapshot } from '../snapshot/test-fixtures';
import * as store from '../snapshot/store';
import { WidgetPreviewMock } from './WidgetPreviewMock';

const fixedNow = new Date(2026, 10, 2, 12, 0).getTime();

const previewSnapshot = fullSnapshot({
  prayer: {
    entries: [
      { at: new Date(2026, 10, 2, 13, 47).getTime(), key: 'asr' },
      { at: new Date(2026, 10, 2, 16, 19).getTime(), key: 'maghrib' },
    ],
    place: 'PLACE',
    validUntil: new Date(2026, 10, 4, 17, 42).getTime(),
  },
  writtenAt: new Date(2026, 10, 2, 0, 0).getTime(),
});

describe('WidgetPreviewMock', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(fixedNow);
    jest.spyOn(store, 'readWidgetSnapshot').mockReturnValue(previewSnapshot);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each(locales)('renders next prayer preview in %s', async (locale) => {
    const view = await renderUi(<WidgetPreviewMock testID="preview" variant="nextPrayerSmall" />, { locale });
    expect(view.getByTestId('preview')).toBeOnTheScreen();
  });

  it('uses live now for prayer state, not writtenAt, and shows remaining', async () => {
    const locale = 'en';
    const at = new Date(2026, 10, 2, 13, 47).getTime();
    const view = await renderUi(<WidgetPreviewMock testID="preview" variant="nextPrayerSmall" />, { locale });

    expect(view.getByText(prayerClock(new Date(at), locale))).toBeOnTheScreen();
    expect(view.getByText(formatPlaybackClock(at - fixedNow, locale))).toBeOnTheScreen();
    expect(view.getByText('LABEL remaining')).toBeOnTheScreen();
    expect(view.queryByText('12:00')).toBeNull();
  });

  it('uses theme tokens only in the component source', () => {
    expect(featureComponentLiterals('features/widgets/components/WidgetPreviewMock.tsx')).toEqual([]);
  });
});
