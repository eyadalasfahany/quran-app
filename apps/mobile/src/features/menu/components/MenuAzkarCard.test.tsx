import { fireEvent, screen } from '@testing-library/react-native';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { useContinueAzkar } from '@/features/azkar/data';

import { MenuAzkarCard } from './MenuAzkarCard';

// The card reads the Azkar progress through the continue hook; the content database is not open under Jest.
jest.mock('@/features/azkar/data', () => ({
  useContinueAzkar: jest.fn(),
}));

const scope = {
  scopeKey: 'category:morning',
  periodKey: 'day:2026-11-01',
  total: 24,
  categoryId: 'morning',
  entryKey: null,
  occasion: 'morning',
} as const;

describe('MenuAzkarCard', () => {
  beforeEach(() => {
    jest.mocked(useContinueAzkar).mockReset();
  });

  it('shows the scope in progress with its title, count and bar', async () => {
    jest.mocked(useContinueAzkar).mockReturnValue({ scope, completed: 12 } as never);
    await renderUi(<MenuAzkarCard onPress={jest.fn()} />);

    expect(screen.getByText('تابع')).toBeOnTheScreen();
    expect(screen.getByText('أذكار الصباح')).toBeOnTheScreen();
    expect(screen.getByTestId('menu-card-azkar-preview')).toHaveTextContent('١٢ من ٢٤');
    expect(flatStyle(screen.getByTestId('menu-card-azkar-progress').props.style).width).toBe('50%');
  });

  it('shows the subtitle and no bar when nothing is in progress', async () => {
    jest.mocked(useContinueAzkar).mockReturnValue(null);
    await renderUi(<MenuAzkarCard onPress={jest.fn()} />);

    expect(screen.getByText('الذكر')).toBeOnTheScreen();
    expect(screen.getByText('الأذكار')).toBeOnTheScreen();
    expect(screen.getByTestId('menu-card-azkar-preview')).toHaveTextContent('الأذكار حسب المناسبة');
    expect(screen.queryByTestId('menu-card-azkar-progress')).toBeNull();
  });

  it('opens Azkar when pressed', async () => {
    const onPress = jest.fn();
    jest.mocked(useContinueAzkar).mockReturnValue(null);
    await renderUi(<MenuAzkarCard onPress={onPress} />);

    fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('labels the card in %s', async (locale) => {
    jest.mocked(useContinueAzkar).mockReturnValue({ scope, completed: 0 } as never);
    await renderUi(<MenuAzkarCard onPress={jest.fn()} />, { locale });

    expect(screen.getByRole('button', { name: locale === 'ar' ? 'تابع, أذكار الصباح, ٠ من ٢٤' : 'Continue, Morning azkar, 0 of 24' })).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/menu/components/MenuAzkarCard.tsx')).toEqual([]);
  });
});
