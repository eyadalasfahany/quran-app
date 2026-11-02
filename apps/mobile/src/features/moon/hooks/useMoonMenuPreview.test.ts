import { renderHook } from '@testing-library/react-native';

import { i18n } from '@/core/i18n';

import { useMoonMenuPreview } from './useMoonMenuPreview';

const location: { snapshot: unknown } = { snapshot: null };

jest.mock('./useMoonLocation', () => ({
  useMoonLocation: () => ({ snapshot: location.snapshot, pending: false, refresh: async () => {} }),
}));

const COORDS = { coords: { lat: 21.4225, lng: 39.8262 }, cityName: { ar: 'مكة المكرمة', en: 'Makkah' }, source: 'manual' };

async function setLanguage(language: 'ar' | 'en') {
  await i18n.changeLanguage(language);
}

describe('useMoonMenuPreview', () => {
  it('asks for a location in Arabic when none is set', async () => {
    await setLanguage('ar');
    location.snapshot = null;
    const { result } = await renderHook(() => useMoonMenuPreview(new Date(2026, 10, 2, 12, 0)));
    expect(result.current).toBe('حدّد موقعك');
  });

  it('asks for a location in English when none is set', async () => {
    await setLanguage('en');
    location.snapshot = null;
    const { result } = await renderHook(() => useMoonMenuPreview(new Date(2026, 10, 2, 12, 0)));
    expect(result.current).toBe('Set your location');
  });

  it('shows the conjunction relative to now in Arabic, not the zone label', async () => {
    await setLanguage('ar');
    location.snapshot = COORDS;
    const { result } = await renderHook(() => useMoonMenuPreview(new Date(2026, 10, 2, 12, 0)));
    expect(result.current).toMatch(/^الاقتران (خلال|قبل) /);
    expect(result.current).not.toMatch(/المنطقة/);
  });

  it('shows the conjunction relative to now in English', async () => {
    await setLanguage('en');
    location.snapshot = COORDS;
    const { result } = await renderHook(() => useMoonMenuPreview(new Date(2026, 10, 2, 12, 0)));
    expect(result.current).toMatch(/^Conjunction (in \d+ (days?|hours?|minutes?)|\d+ (days?|hours?|minutes?) ago)$/);
  });
});
