import { fireEvent } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';

import { HijriMonthHeader } from './HijriMonthHeader';

const TITLE = 'جمادى الأولى ١٤٤٨';
const SUBTITLE = '١٢ أكتوبر – ١٠ نوفمبر ٢٠٢٦';
const TEST_ID = 'hijri-month-header';

describe('HijriMonthHeader', () => {
  it('renders the month title as a header and the Gregorian range under it', async () => {
    const view = await renderUi(
      <HijriMonthHeader onNext={jest.fn()} onPrevious={jest.fn()} subtitle={SUBTITLE} testID={TEST_ID} title={TITLE} />,
    );

    expect(view.getByRole('header', { name: TITLE })).toBeOnTheScreen();
    expect(view.getByText(SUBTITLE)).toBeOnTheScreen();
  });

  it('calls onPrevious and onNext from the navigation buttons', async () => {
    const onPrevious = jest.fn();
    const onNext = jest.fn();
    const view = await renderUi(
      <HijriMonthHeader onNext={onNext} onPrevious={onPrevious} subtitle={SUBTITLE} testID={TEST_ID} title={TITLE} />,
    );

    fireEvent.press(view.getByTestId(`${TEST_ID}-previous`));
    fireEvent.press(view.getByTestId(`${TEST_ID}-next`));

    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('does not offer the return to today when no handler is given', async () => {
    const view = await renderUi(
      <HijriMonthHeader onNext={jest.fn()} onPrevious={jest.fn()} subtitle={SUBTITLE} testID={TEST_ID} title={TITLE} />,
    );

    expect(view.queryByTestId(`${TEST_ID}-today`)).toBeNull();
  });

  it('offers the return to today when away, and calls it', async () => {
    const onToday = jest.fn();
    const view = await renderUi(
      <HijriMonthHeader
        onNext={jest.fn()}
        onPrevious={jest.fn()}
        onToday={onToday}
        subtitle={SUBTITLE}
        testID={TEST_ID}
        title={TITLE}
      />,
    );

    fireEvent.press(view.getByTestId(`${TEST_ID}-today`));

    expect(onToday).toHaveBeenCalledTimes(1);
  });

  it('renders in English with the English navigation buttons', async () => {
    const view = await renderUi(
      <HijriMonthHeader
        onNext={jest.fn()}
        onPrevious={jest.fn()}
        subtitle="Oct 12 – Nov 10"
        testID={TEST_ID}
        title="Jumada I 1448"
      />,
      { locale: 'en' },
    );

    expect(view.getByLabelText('Previous Hijri month')).toBeOnTheScreen();
    expect(view.getByLabelText('Next Hijri month')).toBeOnTheScreen();
  });
});
