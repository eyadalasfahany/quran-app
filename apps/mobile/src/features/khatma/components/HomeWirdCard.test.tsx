import { fireEvent } from '@testing-library/react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { computeAheadDays, HomeWirdCard } from './HomeWirdCard';

const BASE = {
  dayIndex: 12,
  durationDays: 30,
  onPress: jest.fn(),
  pagesTotal: 604,
};

describe('computeAheadDays', () => {
  it('returns less than one day ahead when behind schedule', () => {
    expect(computeAheadDays(0, 604, 12, 30)).toBeLessThan(1);
  });

  it('returns 1, 2, and 5 when sufficiently ahead', () => {
    const expected = (604 * 12) / 30;
    const oneDayPages = 604 / 30;
    expect(computeAheadDays(Math.ceil(expected + oneDayPages), 604, 12, 30)).toBeGreaterThanOrEqual(1);
    expect(computeAheadDays(Math.ceil(expected + oneDayPages * 2), 604, 12, 30)).toBeGreaterThanOrEqual(2);
    expect(computeAheadDays(Math.ceil(expected + oneDayPages * 5), 604, 12, 30)).toBeGreaterThanOrEqual(5);
  });
});

describe('HomeWirdCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('draws the #Main khatma card with ring percent, title, and day subtitle', async () => {
    const pagesRead = Math.round(604 * 0.4);
    const view = await renderUi(<HomeWirdCard {...BASE} pagesRead={pagesRead} />);

    const button = view.getByRole('button');
    expect(button.props.accessibilityLabel).toMatch(/٤٠[%٪]/);
    expect(view.getByText('ختمتي')).toBeOnTheScreen();
    expect(view.getByText(/اليوم ١٢ من ٣٠/)).toBeOnTheScreen();
  });

  it('appends ahead-by-one copy when the reader is a full day ahead', async () => {
    const expected = (604 * 12) / 30;
    const oneDayPages = 604 / 30;
    const pagesRead = Math.ceil(expected + oneDayPages + 1);
    const view = await renderUi(<HomeWirdCard {...BASE} pagesRead={pagesRead} />);

    expect(view.getByTestId('home-wird-card-subtitle')).toHaveTextContent(/متقدّم بيوم/);
  });

  it('appends ahead-by-two copy when two days ahead', async () => {
    const expected = (604 * 12) / 30;
    const oneDayPages = 604 / 30;
    const pagesRead = Math.ceil(expected + oneDayPages * 2 + 1);
    const view = await renderUi(<HomeWirdCard {...BASE} pagesRead={pagesRead} />);

    expect(view.getByTestId('home-wird-card-subtitle')).toHaveTextContent(/متقدّم بيومين/);
  });

  it('appends ahead-by-five copy when five days ahead', async () => {
    const expected = (604 * 12) / 30;
    const oneDayPages = 604 / 30;
    const pagesRead = Math.ceil(expected + oneDayPages * 5 + 1);
    const view = await renderUi(<HomeWirdCard {...BASE} pagesRead={pagesRead} />);

    expect(view.getByTestId('home-wird-card-subtitle')).toHaveTextContent(/متقدّم بـ٥ أيام/);
  });

  it('omits ahead copy when on or behind schedule', async () => {
    const expected = (604 * 12) / 30;
    const view = await renderUi(<HomeWirdCard {...BASE} pagesRead={Math.floor(expected)} />);

    expect(view.getByTestId('home-wird-card-subtitle')).toHaveTextContent('اليوم ١٢ من ٣٠');
    expect(view.getByTestId('home-wird-card-subtitle')).not.toHaveTextContent('متقدّم');
  });

  it('calls onPress when the card is pressed', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<HomeWirdCard {...BASE} onPress={onPress} pagesRead={100} />);

    fireEvent.press(view.getByTestId('home-wird-card'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('exposes a button with title, subtitle, and percent (%s)', async (locale) => {
    const view = await renderUi(<HomeWirdCard {...BASE} pagesRead={242} />, { locale });
    const title = locale === 'en' ? 'My khatma' : 'ختمتي';
    const button = view.getByRole('button', { name: new RegExp(title) });

    expect(button).toBeOnTheScreen();
    expect(button.props.accessibilityLabel).toMatch(/[%٪]/);
  });

  it.each(locales)('joins title, subtitle and percent with the locale separator (%s)', async (locale) => {
    const view = await renderUi(<HomeWirdCard {...BASE} pagesRead={242} />, { locale });
    const label: string = view.getByRole('button').props.accessibilityLabel;
    const separator = locale === 'ar' ? '، ' : ', ';
    const parts = label.split(separator);

    expect(parts).toHaveLength(3);
    expect(parts[2]).toMatch(locale === 'ar' ? /^[٠-٩]+٪$/ : /^\d+%$/);
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/khatma/components/HomeWirdCard.tsx')).toEqual([]);
  });
});
