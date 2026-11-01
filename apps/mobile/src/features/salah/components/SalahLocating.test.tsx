import { renderUi, locales } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';

import { SalahLocating } from './SalahLocating';

describe('SalahLocating', () => {
  it('is one busy loading region, labelled in Arabic', async () => {
    const view = await renderUi(<SalahLocating />);

    const region = view.getByLabelText('جارٍ التحميل');
    expect(region).toBeOnTheScreen();
    expect(region.props.accessibilityState).toEqual({ busy: true });
  });

  it.each(locales)('is labelled in %s', async (locale) => {
    const view = await renderUi(<SalahLocating />, { locale });

    expect(view.getByLabelText(locale === 'ar' ? 'جارٍ التحميل' : 'Loading')).toBeOnTheScreen();
  });

  it('keeps the test id it is given', async () => {
    const view = await renderUi(<SalahLocating testID="custom-locating" />);

    expect(view.getByTestId('custom-locating')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/salah/components/SalahLocating.tsx')).toEqual([]);
  });
});
