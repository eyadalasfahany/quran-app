import { fireEvent, screen } from '@testing-library/react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';

import { TimelineHeader } from './TimelineHeader';

const base = { onClear: jest.fn(), onNext: jest.fn(), onPrevious: jest.fn(), showClear: false, subtitle: 'detail', title: 'عمره ٥٥ سنة' };

describe('TimelineHeader', () => {
  it.each(locales)('renders the title, the detail and the step arrows (%s)', async (locale) => {
    await renderUi(<TimelineHeader {...base} />, { locale });
    expect(screen.getByRole('header')).toHaveTextContent('عمره ٥٥ سنة');
    expect(screen.getByText('detail')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: locale === 'ar' ? 'العمر السابق' : 'Previous age' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: locale === 'ar' ? 'العمر التالي' : 'Next age' })).toBeOnTheScreen();
  });

  it('shows «الكل» only when something is selected', async () => {
    const idle = await renderUi(<TimelineHeader {...base} />);
    expect(screen.queryByRole('button', { name: 'الكل' })).toBeNull();
    await idle.unmount();
    await renderUi(<TimelineHeader {...base} showClear />);
    expect(screen.getByRole('button', { name: 'الكل' })).toBeOnTheScreen();
  });

  it('calls the right handler for each control', async () => {
    const onClear = jest.fn();
    const onNext = jest.fn();
    const onPrevious = jest.fn();
    await renderUi(<TimelineHeader {...base} onClear={onClear} onNext={onNext} onPrevious={onPrevious} showClear />);
    await press(screen.getByRole('button', { name: 'الكل' }));
    await press(screen.getByRole('button', { name: 'العمر السابق' }));
    await press(screen.getByRole('button', { name: 'العمر التالي' }));
    expect([onClear, onPrevious, onNext].map((fn) => fn.mock.calls.length)).toEqual([1, 1, 1]);
  });

  it('uses the same labels on the vertical bar', async () => {
    await renderUi(<TimelineHeader {...base} orientation="vertical" />);
    expect(screen.getByRole('button', { name: 'العمر السابق' })).toBeOnTheScreen();
  });

  it.each(locales)('gives the title the hide action only when the timeline can be hidden (%s)', async (locale) => {
    const onCollapse = jest.fn();
    const plain = await renderUi(<TimelineHeader {...base} />, { locale });
    expect(screen.getByRole('header').props.accessibilityActions).toBeUndefined();
    await plain.unmount();
    await renderUi(<TimelineHeader {...base} onCollapse={onCollapse} />, { locale });
    expect(screen.getByRole('header').props.accessibilityActions).toEqual([{ label: locale === 'ar' ? 'إخفاء الخط الزمني' : 'Hide timeline', name: 'collapse' }]);
    fireEvent(screen.getByRole('header'), 'accessibilityAction', { nativeEvent: { actionName: 'collapse' } });
    expect(onCollapse).toHaveBeenCalledTimes(1);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/TimelineHeader.tsx')).toEqual([]);
  });
});
