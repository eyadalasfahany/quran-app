import { renderUi } from '../../../../jest/render-ui';

import { MoonSummaryCard } from './MoonSummaryCard';

const ar = {
  ageLabel: '٧ ساعات و٣٨ دقيقة',
  eveningLabel: 'مساء ٢٩ جمادى الأولى ١٤٤٨ · ٩ نوفمبر',
  illumination: 0.003,
  illuminationLabel: '٠٫٣٪',
  waxing: true,
};

describe('MoonSummaryCard', () => {
  it('shows the evening line, the age at sunset and the illumination in Arabic', async () => {
    const view = await renderUi(<MoonSummaryCard {...ar} />);
    expect(view.getByText('مساء ٢٩ جمادى الأولى ١٤٤٨ · ٩ نوفمبر')).toBeOnTheScreen();
    expect(view.getByText('عمر القمر عند الغروب')).toBeOnTheScreen();
    expect(view.getByTestId('moon-summary-card-age')).toHaveTextContent('٧ ساعات و٣٨ دقيقة');
    expect(view.getByText('نسبة الإضاءة')).toBeOnTheScreen();
    expect(view.getByTestId('moon-summary-card-illumination')).toHaveTextContent('٠٫٣٪');
  });

  it('shows the same card in English', async () => {
    const view = await renderUi(
      <MoonSummaryCard
        ageLabel="7 h 38 min"
        eveningLabel="Evening of Jumada I 29, 1448 · Nov 9"
        illumination={0.003}
        illuminationLabel="0.3%"
        waxing
      />,
      { locale: 'en' },
    );
    expect(view.getByText('Evening of Jumada I 29, 1448 · Nov 9')).toBeOnTheScreen();
    expect(view.getByText('Moon age at sunset')).toBeOnTheScreen();
    expect(view.getByTestId('moon-summary-card-age')).toHaveTextContent('7 h 38 min');
    expect(view.getByText('Illuminated')).toBeOnTheScreen();
    expect(view.getByTestId('moon-summary-card-illumination')).toHaveTextContent('0.3%');
  });

  it('renders the phase disc beside the text for a waning moon', async () => {
    const view = await renderUi(<MoonSummaryCard {...ar} waxing={false} />);
    expect(view.getByTestId('moon-phase-disc')).toBeOnTheScreen();
  });
});
