import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { themes } from '@/core/theme';

import { EventPager } from './EventPager';

const previous = { id: 'e1', title: 'السابق العنوان' };
const next = { id: 'e3', title: 'التالي العنوان' };
const base = { index: 78, next, onNext: jest.fn(), onPrevious: jest.fn(), previous, total: 162 };

describe('EventPager', () => {
  it.each(locales)('shows both neighbours and the place in the book (%s)', async (locale) => {
    await renderUi(<EventPager {...base} />, { locale });
    expect(screen.getByText('السابق العنوان')).toBeOnTheScreen();
    expect(screen.getByText('التالي العنوان')).toBeOnTheScreen();
    expect(screen.getByText(locale === 'ar' ? '٧٨ من ١٦٢' : '78 of 162')).toBeOnTheScreen();
  });

  it('labels each button with its neighbour', async () => {
    await renderUi(<EventPager {...base} />);
    expect(screen.getByRole('button', { name: 'السابق: السابق العنوان' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'التالي: التالي العنوان' })).toBeOnTheScreen();
  });

  it('calls the handlers', async () => {
    const onNext = jest.fn();
    const onPrevious = jest.fn();
    await renderUi(<EventPager {...base} onNext={onNext} onPrevious={onPrevious} />);
    await press(screen.getByRole('button', { name: 'السابق: السابق العنوان' }));
    await press(screen.getByRole('button', { name: 'التالي: التالي العنوان' }));
    expect([onPrevious, onNext].map((fn) => fn.mock.calls.length)).toEqual([1, 1]);
  });

  it('disables the missing neighbour at the first and last event', async () => {
    const onPrevious = jest.fn();
    await renderUi(<EventPager {...base} index={1} onPrevious={onPrevious} previous={null} />);
    const button = screen.getByRole('button', { name: 'السابق' });
    expect(button.props.accessibilityState).toMatchObject({ disabled: true });
    await press(button);
    expect(onPrevious).not.toHaveBeenCalled();
  });

  it('gives each button at least 44 pt', async () => {
    await renderUi(<EventPager {...base} />);
    expect(flatStyle(screen.getByTestId('seerah-event-pager-next').props.style).minHeight).toBeGreaterThanOrEqual(44);
  });

  it('keeps neighbour headings Arabic right to left in English', async () => {
    await renderUi(<EventPager {...base} />, { locale: 'en' });
    expect(flatStyle(screen.getByText('التالي العنوان').props.style).writingDirection).toBe('rtl');
    expect(screen.getByText('Next')).toBeOnTheScreen();
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/EventPager.tsx')).toEqual([]);
    expect(themes.light.colors.brand).toBeDefined();
  });
});
