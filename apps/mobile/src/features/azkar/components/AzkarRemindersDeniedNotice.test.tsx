import { fireEvent, screen } from '@testing-library/react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';

import { AzkarRemindersDeniedNotice } from './AzkarRemindersDeniedNotice';

describe('AzkarRemindersDeniedNotice', () => {
  it('says that notifications are off for Taybah and what to do', async () => {
    await renderUi(<AzkarRemindersDeniedNotice onOpenSettings={jest.fn()} />);

    expect(screen.getByRole('header', { name: 'الإشعارات متوقفة لطيبة' })).toBeOnTheScreen();
    expect(screen.getByText('فعّلها من إعدادات الجهاز لتصلك التذكيرات.')).toBeOnTheScreen();
  });

  it('opens the device settings from its button', async () => {
    const onOpenSettings = jest.fn();
    await renderUi(<AzkarRemindersDeniedNotice onOpenSettings={onOpenSettings} />);

    fireEvent.press(screen.getByRole('button', { name: 'فتح الإعدادات' }));

    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('renders under %s', async (locale) => {
    await renderUi(<AzkarRemindersDeniedNotice onOpenSettings={jest.fn()} />, { locale });

    const button = locale === 'en' ? 'Open Settings' : 'فتح الإعدادات';
    expect(screen.getByRole('button', { name: button })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/azkar/components/AzkarRemindersDeniedNotice.tsx')).toEqual([]);
  });
});
