import { locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';

import { OfflineBanner } from './OfflineBanner';

const arabic = 'أنت غير متصل. المصحف والتلاوات المحمّلة تعمل كالمعتاد.';
const english = 'You are offline. The mushaf and downloaded recitations work as usual.';

describe('OfflineBanner', () => {
  it('draws the frame text as a status notice when visible', async () => {
    const view = await renderUi(<OfflineBanner visible />);

    expect(view.getByLabelText(arabic)).toBeOnTheScreen();
    expect(view.getByText(arabic)).toBeOnTheScreen();
    // The glyph is decorative, so it is hidden from accessibility and found with includeHiddenElements.
    expect(view.getByTestId('offline-banner-icon', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('draws nothing while the device is online', async () => {
    const view = await renderUi(<OfflineBanner visible={false} testID="banner" />);

    expect(view.queryByTestId('banner')).toBeNull();
    expect(view.queryByText(arabic)).toBeNull();
  });

  it('never takes a press: it is a notice, not a control', async () => {
    const view = await renderUi(<OfflineBanner visible />);

    expect(view.queryByRole('button')).toBeNull();
  });

  it.each(locales)('shows its message under %s', async (locale) => {
    const view = await renderUi(<OfflineBanner visible />, { locale });
    const message = locale === 'ar' ? arabic : english;

    expect(view.getByLabelText(message)).toBeOnTheScreen();
  });

  it('uses theme tokens only', () => {
    expect(rawColorLiterals('OfflineBanner.tsx')).toEqual([]);
  });
});
