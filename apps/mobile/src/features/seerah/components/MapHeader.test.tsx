import { screen } from '@testing-library/react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';

import { MapHeader } from './MapHeader';

const base = { onBack: jest.fn(), onOpenKey: jest.fn(), onToggleView: jest.fn(), subtitle: 'الجزيرة العربية', title: 'السيرة النبوية' };

describe('MapHeader', () => {
  it.each(locales)('shows the title, the subtitle and the three buttons (%s)', async (locale) => {
    await renderUi(<MapHeader {...base} />, { locale });
    expect(screen.getByRole('header')).toBeOnTheScreen();
    expect(screen.getByText('السيرة النبوية')).toBeOnTheScreen();
    expect(screen.getByText('الجزيرة العربية')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: locale === 'ar' ? 'رجوع' : 'Back' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: locale === 'ar' ? 'مفتاح الخريطة' : 'Map key' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: locale === 'ar' ? 'عرض كقائمة' : 'Show as list' })).toBeOnTheScreen();
  });

  it('each button calls its handler', async () => {
    const onBack = jest.fn();
    const onOpenKey = jest.fn();
    const onToggleView = jest.fn();
    await renderUi(<MapHeader {...base} onBack={onBack} onOpenKey={onOpenKey} onToggleView={onToggleView} />);
    await press(screen.getByRole('button', { name: 'رجوع' }));
    await press(screen.getByRole('button', { name: 'مفتاح الخريطة' }));
    await press(screen.getByRole('button', { name: 'عرض كقائمة' }));
    expect([onBack, onOpenKey, onToggleView].map((fn) => fn.mock.calls.length)).toEqual([1, 1, 1]);
  });

  it('on a city map the level chip replaces back and returns to the region', async () => {
    const onPress = jest.fn();
    await renderUi(<MapHeader {...base} levelChip={{ label: 'المنطقة', onPress }} />);
    expect(screen.queryByRole('button', { name: 'رجوع' })).toBeNull();
    await press(screen.getByRole('button', { name: 'العودة إلى خريطة المنطقة' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByText('المنطقة')).toBeOnTheScreen();
  });

  it('the list view offers the map', async () => {
    await renderUi(<MapHeader {...base} view="list" />);
    expect(screen.getByRole('button', { name: 'عرض كخريطة' })).toBeOnTheScreen();
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/MapHeader.tsx')).toEqual([]);
  });
});
