import { renderUi } from '../../../../jest/render-ui';

import { MoonDisclaimer } from './MoonDisclaimer';

describe('MoonDisclaimer', () => {
  it('states that the estimate is not a ruling, in Arabic', async () => {
    const view = await renderUi(<MoonDisclaimer />);
    expect(
      view.getByText('تقدير فلكي لموقعك وليس حكمًا بدخول الشهر. المعتمد هو إعلان الجهة الرسمية في بلدك.'),
    ).toBeOnTheScreen();
  });

  it('states the same in English', async () => {
    const view = await renderUi(<MoonDisclaimer />, { locale: 'en' });
    expect(view.getByText(/An astronomical estimate for your location, not a ruling/)).toBeOnTheScreen();
  });
});
