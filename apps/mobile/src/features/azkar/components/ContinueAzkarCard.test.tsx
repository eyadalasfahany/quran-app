import { amiriNaturalLeading } from '@quran/design-tokens';
import { screen } from '@testing-library/react-native';

import { themes } from '@/core/theme';

import { press } from '../../../../jest/azkar-ui-fixtures';
import { flatStyle, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { ContinueAzkarCard } from './ContinueAzkarCard';

const RESUME = { completed: 12, title: 'أذكار الصباح', total: 24 };

describe('ContinueAzkarCard', () => {
  it('renders nothing when there is nothing to continue', async () => {
    await renderUi(<ContinueAzkarCard onPress={jest.fn()} resume={null} />);

    expect(screen.queryByTestId('azkar-continue-card')).toBeNull();
  });

  it('shows the title, the count and the resume action', async () => {
    await renderUi(<ContinueAzkarCard onPress={jest.fn()} resume={{ completed: 12, title: 'أذكار الصباح', total: 24 }} />);

    expect(screen.getByText('أذكار الصباح')).toBeOnTheScreen();
    expect(screen.getByText('١٢ من ٢٤')).toBeOnTheScreen();
    expect(screen.getByText('متابعة')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'تابع, أذكار الصباح, ١٢ من ٢٤' })).toBeOnTheScreen();
  });

  it('sets the bar to the completed share', async () => {
    await renderUi(<ContinueAzkarCard onPress={jest.fn()} resume={{ completed: 6, title: 'x', total: 24 }} />);

    expect(flatStyle(screen.getByTestId('azkar-continue-card-progress').props.style).width).toBe('25%');
  });

  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    await renderUi(<ContinueAzkarCard onPress={onPress} resume={{ completed: 0, title: 'x', total: 3 }} />);

    await press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders the English labels', async () => {
    await renderUi(<ContinueAzkarCard onPress={jest.fn()} resume={{ completed: 2, title: 'Morning', total: 10 }} />, {
      locale: 'en',
    });

    expect(screen.getByText('2 of 10')).toBeOnTheScreen();
    expect(screen.getByText('Resume')).toBeOnTheScreen();
  });

  it.each([
    ['light', themes.light.colors],
    ['dark', themes.dark.colors],
  ] as const)('draws the text on the brand card in its on-brand surface tokens in %s', async (theme, colors) => {
    await renderUi(<ContinueAzkarCard onPress={jest.fn()} resume={RESUME} />, { theme });

    expect(flatStyle(screen.getByText('أذكار الصباح').props.style).color).toBe(colors.onBrandSurface);
    expect(flatStyle(screen.getByText('متابعة').props.style).color).toBe(colors.onBrandSurface);
    expect(flatStyle(screen.getByText('تابع').props.style).color).toBe(colors.onBrandSurfaceMuted);
    expect(flatStyle(screen.getByText('١٢ من ٢٤').props.style).color).toBe(colors.onBrandSurfaceMuted);
  });

  it('gives the title a line height of at least Amiri natural leading, so marks above letters are not clipped', async () => {
    await renderUi(<ContinueAzkarCard onPress={jest.fn()} resume={RESUME} />);
    const title = flatStyle(screen.getByText('أذكار الصباح').props.style);

    expect(title.lineHeight).toBeGreaterThanOrEqual(Math.round(34 * amiriNaturalLeading));
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/azkar/components/ContinueAzkarCard.tsx')).toEqual([]);
  });
});
