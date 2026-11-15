import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { themes } from '@/core/theme';

import { EventHeader } from './EventHeader';

const base = { age: 54, onAgePress: jest.fn(), onPlacePress: jest.fn(), placeName: 'بدر', title: '[عنوان الفصل في الكتاب]' };

describe('EventHeader', () => {
  it.each(locales)('shows the heading as the title with both chips (%s)', async (locale) => {
    await renderUi(<EventHeader {...base} />, { locale });
    expect(screen.getByRole('header')).toHaveTextContent('[عنوان الفصل في الكتاب]');
    expect(screen.getByText(locale === 'ar' ? 'عمره ٥٤ سنة' : 'Age 54')).toBeOnTheScreen();
    expect(screen.getByText('بدر')).toBeOnTheScreen();
  });

  it('keeps the heading as stored, in Amiri at 30', async () => {
    await renderUi(<EventHeader {...base} title="  عنوان  " />);
    const title = screen.getByRole('header');
    expect(title).toHaveTextContent('  عنوان  ');
    expect(flatStyle(title.props.style)).toMatchObject({ fontSize: 30, lineHeight: 40, writingDirection: 'rtl' });
  });

  it('routes each chip tap', async () => {
    const onAgePress = jest.fn();
    const onPlacePress = jest.fn();
    await renderUi(<EventHeader {...base} onAgePress={onAgePress} onPlacePress={onPlacePress} />);
    await press(screen.getByTestId('seerah-event-header-age'));
    await press(screen.getByTestId('seerah-event-header-place'));
    expect([onAgePress, onPlacePress].map((fn) => fn.mock.calls.length)).toEqual([1, 1]);
  });

  it('shows the dashed «غير محدد» and «أخرى» chips for the unspecified buckets', async () => {
    await renderUi(<EventHeader {...base} age={null} placeIsOther placeName="أخرى" />);
    expect(screen.getByText('العمر غير محدد')).toBeOnTheScreen();
    expect(flatStyle(screen.getByTestId('seerah-event-header-place').props.style).borderStyle).toBe('dashed');
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/EventHeader.tsx')).toEqual([]);
    expect(themes.light.colors.ink).toBeDefined();
  });
});
