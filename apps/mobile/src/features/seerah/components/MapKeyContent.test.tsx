import { screen } from '@testing-library/react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { themes } from '@/core/theme';

import { MapKeyContent } from './MapKeyContent';

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ bottom: 34, left: 0, right: 0, top: 47 }) };
});

describe('MapKeyContent', () => {
  it.each(locales)('has the title, the three sections and a close button (%s)', async (locale) => {
    const onClose = jest.fn();
    await renderUi(<MapKeyContent onClose={onClose} />, { locale });
    expect(screen.getAllByRole('header')[0]).toHaveTextContent(locale === 'ar' ? 'مفتاح الخريطة' : 'Map key');
    ['places', 'routes', 'timeline'].forEach((section) => expect(screen.getAllByRole('header').length).toBeGreaterThanOrEqual(4));
    expect(screen.getByText(locale === 'ar' ? 'المواضع' : 'Places')).toBeOnTheScreen();
    expect(screen.getByText(locale === 'ar' ? 'الطرق' : 'Routes')).toBeOnTheScreen();
    expect(screen.getByText(locale === 'ar' ? 'الخط الزمني: عمره ﷺ' : 'Timeline: the Prophet’s age')).toBeOnTheScreen();
  });

  it('closes', async () => {
    const onClose = jest.fn();
    await renderUi(<MapKeyContent onClose={onClose} />);
    await press(screen.getByRole('button', { name: 'إغلاق' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('explains each place symbol', async () => {
    await renderUi(<MapKeyContent onClose={jest.fn()} />);
    ['city', 'cluster', 'single', 'approximate', 'empty', 'other', 'edge'].forEach((key) =>
      expect(screen.getByTestId(`seerah-map-key-${key}`)).toBeOnTheScreen(),
    );
    expect(screen.getByLabelText('مدينة لها خريطة، الحلقة الذهبية: اضغط للدخول إلى خريطتها')).toBeOnTheScreen();
  });

  it('explains the five routes', async () => {
    await renderUi(<MapKeyContent onClose={jest.fn()} />);
    ['hijra', 'taif', 'trip', 'habasha', 'ghazwa'].forEach((key) => expect(screen.getByTestId(`seerah-map-key-route-${key}`)).toBeOnTheScreen());
    expect(screen.getByText('الهجرة إلى الحبشة')).toBeOnTheScreen();
  });

  it('lists the four life stages with their ranges and the milestone note', async () => {
    await renderUi(<MapKeyContent onClose={jest.fn()} />);
    expect(screen.getByText('٠–١١')).toBeOnTheScreen();
    expect(screen.getByText('١٢–١٩')).toBeOnTheScreen();
    expect(screen.getByText('٢٠–٣٩')).toBeOnTheScreen();
    expect(screen.getByText('٤٠–٦٣')).toBeOnTheScreen();
    expect(screen.getByText('محطة: المولد، الزواج من خديجة، نزول الوحي، الهجرة، الوفاة')).toBeOnTheScreen();
  });

  it('English uses Western digits for the ranges', async () => {
    await renderUi(<MapKeyContent onClose={jest.fn()} />, { locale: 'en' });
    expect(screen.getByText('40–63')).toBeOnTheScreen();
  });

  it('keeps every sample out of the touch and accessibility order: only the close button is a button', async () => {
    await renderUi(<MapKeyContent onClose={jest.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/MapKeyContent.tsx')).toEqual([]);
    expect(themes.light.colors.highlightRose).toBeDefined();
  });
});
