import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { themes } from '@/core/theme';

import { EventCallout } from './EventCallout';

describe('EventCallout', () => {
  it.each(locales)('shows the title, the subtitle and «فتح» (%s)', async (locale) => {
    await renderUi(<EventCallout onOpen={jest.fn()} subtitle="عمره ٥٠ سنة · الحجون" title="عام الحزن" />, { locale });
    expect(screen.getByText('عام الحزن')).toBeOnTheScreen();
    expect(screen.getByText('عمره ٥٠ سنة · الحجون')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: locale === 'ar' ? 'فتح: عام الحزن' : 'Open: عام الحزن' })).toBeOnTheScreen();
  });

  it('opens the event on a tap', async () => {
    const onOpen = jest.fn();
    await renderUi(<EventCallout onOpen={onOpen} subtitle="x" title="عام الحزن" />);
    await press(screen.getByRole('button', { name: 'فتح: عام الحزن' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('is one button for screen readers, not two', async () => {
    await renderUi(<EventCallout onOpen={jest.fn()} subtitle="x" title="t" />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('is at least 44 pt tall and keeps an Arabic title right to left in English', async () => {
    await renderUi(<EventCallout onOpen={jest.fn()} subtitle="x" title="عام الحزن" />, { locale: 'en' });
    expect(flatStyle(screen.getByRole('button').props.style).minHeight).toBeGreaterThanOrEqual(44);
    expect(flatStyle(screen.getByText('عام الحزن').props.style).writingDirection).toBe('rtl');
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/EventCallout.tsx')).toEqual([]);
    expect(themes.light.colors.line).toBeDefined();
  });
});
