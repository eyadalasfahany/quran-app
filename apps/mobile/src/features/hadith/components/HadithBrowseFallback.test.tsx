import { screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { locales, renderUi } from '../../../../jest/render-ui';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';

import { HadithBrowseFallback } from './HadithBrowseFallback';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), push: jest.fn(), replace: jest.fn() },
}));

describe('HadithBrowseFallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(locales)('renders in Arabic and English (%s)', async (locale) => {
    await renderUi(<HadithBrowseFallback kind="notFound" onBack={jest.fn()} />, { locale });
    expect(screen.getByText(locale === 'ar' ? 'المحتوى غير متوفر' : 'Not available')).toBeOnTheScreen();
  });

  it('loading shows the skeleton and the back button', async () => {
    const onBack = jest.fn();
    await renderUi(<HadithBrowseFallback kind="loading" onBack={onBack} />);
    expect(screen.getByLabelText('جارٍ التحميل')).toBeOnTheScreen();
    await press(screen.getByRole('button', { name: 'رجوع' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('not-found shows the title and a browse action that replaces with the hadith home', async () => {
    await renderUi(<HadithBrowseFallback kind="notFound" onBack={jest.fn()} />);
    expect(screen.getByText('قد لا تكون المجموعة محمّلة على هذا الجهاز.')).toBeOnTheScreen();
    await press(screen.getByRole('button', { name: 'تصفّح المجموعات' }));
    expect(router.replace).toHaveBeenCalledWith('/hadith');
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/hadith/components/HadithBrowseFallback.tsx')).toEqual([]);
  });
});
