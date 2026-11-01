import { locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';

import { StaleContentBanner } from './StaleContentBanner';

const arabic = 'اتصل لتحديث المحتوى';
const english = 'Connect to update the content';

describe('StaleContentBanner', () => {
  it('asks the reader to connect when visible', async () => {
    const view = await renderUi(<StaleContentBanner visible />);

    expect(view.getByLabelText(arabic)).toBeOnTheScreen();
    expect(view.getByText(arabic)).toBeOnTheScreen();
    // The glyph is decorative, so it is hidden from accessibility and found with includeHiddenElements.
    expect(view.getByTestId('stale-content-banner-icon', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('draws nothing while the content is fresh', async () => {
    const view = await renderUi(<StaleContentBanner visible={false} testID="stale" />);

    expect(view.queryByTestId('stale')).toBeNull();
    expect(view.queryByText(arabic)).toBeNull();
  });

  it('blocks nothing: it has no control in it', async () => {
    const view = await renderUi(<StaleContentBanner visible />);

    expect(view.queryByRole('button')).toBeNull();
  });

  it.each(locales)('shows its message under %s', async (locale) => {
    const view = await renderUi(<StaleContentBanner visible />, { locale });
    const message = locale === 'ar' ? arabic : english;

    expect(view.getByLabelText(message)).toBeOnTheScreen();
  });

  it('uses theme tokens only', () => {
    expect(rawColorLiterals('StaleContentBanner.tsx')).toEqual([]);
  });
});
