import { fireEvent } from '@testing-library/react-native';

import { i18n } from '@/core/i18n';

import { locales, renderUi } from '../../../../jest/render-ui';

import { RecommendedRemindersContent } from './RecommendedRemindersContent';

describe('RecommendedRemindersContent', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('ar');
  });

  it('lists the four items when Azkar content is installed', async () => {
    const view = await renderUi(<RecommendedRemindersContent hasAzkar onAccept={jest.fn()} onChoose={jest.fn()} />);

    expect(view.getByText('أوقات الصلاة الخمسة')).toBeOnTheScreen();
    expect(view.getByText('أذكار الصباح بعد صلاة الفجر')).toBeOnTheScreen();
    expect(view.getByText('أذكار المساء بعد صلاة العصر')).toBeOnTheScreen();
    expect(view.getByText('سورة الكهف يوم الجمعة')).toBeOnTheScreen();
    expect(view.getByText('لا يُقترح وقت محدد للأذكار، فهي تُرتبط بالصلاة فقط.')).toBeOnTheScreen();
  });

  it('lists only the prayers and Friday without Azkar content', async () => {
    const view = await renderUi(<RecommendedRemindersContent hasAzkar={false} onAccept={jest.fn()} onChoose={jest.fn()} />);

    expect(view.queryByText('أذكار الصباح بعد صلاة الفجر')).toBeNull();
    expect(view.getByText('سورة الكهف يوم الجمعة')).toBeOnTheScreen();
  });

  it('enables the set only from the primary button', async () => {
    const onAccept = jest.fn();
    const onChoose = jest.fn();
    const view = await renderUi(<RecommendedRemindersContent hasAzkar onAccept={onAccept} onChoose={onChoose} />);

    expect(onAccept).not.toHaveBeenCalled();
    fireEvent.press(view.getByRole('button', { name: 'فعّل التذكيرات المقترحة' }));
    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it('keeps the hub with «اختيار بنفسي»', async () => {
    const onChoose = jest.fn();
    const view = await renderUi(<RecommendedRemindersContent hasAzkar onAccept={jest.fn()} onChoose={onChoose} />);

    fireEvent.press(view.getByRole('button', { name: 'اختيار بنفسي' }));

    expect(onChoose).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('renders in %s', async (locale) => {
    await i18n.changeLanguage(locale);
    const view = await renderUi(<RecommendedRemindersContent hasAzkar={false} onAccept={jest.fn()} onChoose={jest.fn()} />, {
      locale,
    });

    expect(view.getByText(locale === 'ar' ? 'سورة الكهف يوم الجمعة' : 'Surat al-Kahf on Friday')).toBeOnTheScreen();
  });
});
