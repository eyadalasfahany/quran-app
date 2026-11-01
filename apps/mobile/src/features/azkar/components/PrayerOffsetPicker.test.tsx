import { fireEvent, screen } from '@testing-library/react-native';
import type { ComponentProps } from 'react';

import { locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { PrayerOffsetPicker } from './PrayerOffsetPicker';

type Props = Partial<ComponentProps<typeof PrayerOffsetPicker>>;

async function renderPicker(props: Props = {}) {
  const handlers = {
    onPrayerChange: jest.fn(),
    onOffsetChange: jest.fn(),
    onOpenLocation: jest.fn(),
  };
  const view = await renderUi(
    <PrayerOffsetPicker
      needsLocation={false}
      offsetMinutes={10}
      onOffsetChange={handlers.onOffsetChange}
      onOpenLocation={handlers.onOpenLocation}
      onPrayerChange={handlers.onPrayerChange}
      prayer="maghrib"
      {...props}
    />,
  );
  return { view, handlers };
}

describe('PrayerOffsetPicker', () => {
  it('offers the five prayers as radio chips and marks the chosen one', async () => {
    await renderPicker();

    for (const name of ['الفجر', 'الظهر', 'العصر', 'المغرب', 'العشاء']) {
      expect(screen.getByRole('radio', { name })).toBeOnTheScreen();
    }
    expect(screen.getByRole('radio', { name: 'المغرب' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'الفجر' })).not.toBeChecked();
  });

  it('shows no prayer as chosen until one is picked', async () => {
    await renderPicker({ prayer: null });

    expect(screen.getByRole('radio', { name: 'المغرب' })).not.toBeChecked();
  });

  it('reports the prayer that is pressed', async () => {
    const { handlers } = await renderPicker();

    await fireEvent.press(screen.getByRole('radio', { name: 'العصر' }));

    expect(handlers.onPrayerChange).toHaveBeenCalledWith('asr');
  });

  it('shows the offset in words, and steps it by five minutes', async () => {
    const { handlers } = await renderPicker({ offsetMinutes: 10 });

    expect(screen.getByText('بعد ١٠ دقائق')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'زيادة الإزاحة' }));
    expect(handlers.onOffsetChange).toHaveBeenLastCalledWith(15);
    await fireEvent.press(screen.getByRole('button', { name: 'تقليل الإزاحة' }));
    expect(handlers.onOffsetChange).toHaveBeenLastCalledWith(5);
  });

  it('reads zero as at the prayer time', async () => {
    await renderPicker({ offsetMinutes: 0 });

    expect(screen.getByText('عند الصلاة')).toBeOnTheScreen();
  });

  it('treats an unset offset as zero', async () => {
    await renderPicker({ offsetMinutes: null });

    expect(screen.getByText('عند الصلاة')).toBeOnTheScreen();
  });

  it('stops the stepper at zero', async () => {
    const { handlers } = await renderPicker({ offsetMinutes: 0 });

    expect(screen.getByRole('button', { name: 'تقليل الإزاحة' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: 'تقليل الإزاحة' }));
    expect(handlers.onOffsetChange).not.toHaveBeenCalled();
  });

  it('caps the stepper at 120 minutes', async () => {
    const { handlers } = await renderPicker({ offsetMinutes: 120 });

    expect(screen.getByRole('button', { name: 'زيادة الإزاحة' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: 'زيادة الإزاحة' }));
    expect(handlers.onOffsetChange).not.toHaveBeenCalled();
  });

  it('shows the location notice with a way to the Salah location when none is known', async () => {
    const { handlers } = await renderPicker({ needsLocation: true });

    expect(screen.getByText('حدّد موقعك في الصلاة لاستخدام هذا الخيار')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'تحديد الموقع' }));
    expect(handlers.onOpenLocation).toHaveBeenCalledTimes(1);
  });

  it('hides the location notice when a location is known', async () => {
    await renderPicker({ needsLocation: false });

    expect(screen.queryByText('حدّد موقعك في الصلاة لاستخدام هذا الخيار')).toBeNull();
  });

  it.each(locales)('renders under %s', async (locale) => {
    await renderUi(
      <PrayerOffsetPicker
        needsLocation={false}
        offsetMinutes={10}
        onOffsetChange={jest.fn()}
        onOpenLocation={jest.fn()}
        onPrayerChange={jest.fn()}
        prayer="maghrib"
      />,
      { locale },
    );

    expect(screen.getByRole('radio', { name: locale === 'en' ? 'Maghrib' : 'المغرب' })).toBeOnTheScreen();
    expect(screen.getByText(locale === 'en' ? '10 minutes after' : 'بعد ١٠ دقائق')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/azkar/components/PrayerOffsetPicker.tsx')).toEqual([]);
  });
});
