import { screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { physicalSides } from '../../../../jest/hadith-ui-fixtures';
import { themes } from '@/core/theme';
import { maxFontScale } from '@/shared/ui';

import { HadithListHeader } from './HadithListHeader';

const TEST_ID = 'hadith-list-header';

describe('HadithListHeader', () => {
  it.each(locales)('renders in Arabic and English (%s)', async (locale) => {
    await renderUi(<HadithListHeader onBack={jest.fn()} title="[عنوان]" />, { locale });
    expect(screen.getByRole('button', { name: locale === 'ar' ? 'رجوع' : 'Back' })).toBeOnTheScreen();
  });

  it('shows the back button, title and subtitle', async () => {
    await renderUi(<HadithListHeader onBack={jest.fn()} subtitle="[عنوان فرعي]" title="[عنوان]" />);
    expect(screen.getByRole('button', { name: 'رجوع' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: '[عنوان]' })).toBeOnTheScreen();
    expect(screen.getByText('[عنوان فرعي]')).toBeOnTheScreen();
  });

  it('shows only back and trailing when there is no title', async () => {
    await renderUi(<HadithListHeader onBack={jest.fn()} trailing={<Text>[زر]</Text>} />);
    expect(screen.getByRole('button', { name: 'رجوع' })).toBeOnTheScreen();
    expect(screen.getByText('[زر]')).toBeOnTheScreen();
    expect(screen.queryByRole('header')).toBeNull();
  });

  it('lg is 26 point, md is 22 point', async () => {
    const lg = await renderUi(<HadithListHeader onBack={jest.fn()} title="[عنوان]" titleSize="lg" />);
    expect(flatStyle(screen.getByRole('header').props.style).fontSize).toBe(26);
    await lg.unmount();
    await renderUi(<HadithListHeader onBack={jest.fn()} title="[عنوان]" titleSize="md" />);
    expect(flatStyle(screen.getByRole('header').props.style).fontSize).toBe(22);
  });

  it('mirrors the back chevron in Arabic', async () => {
    await renderUi(<HadithListHeader onBack={jest.fn()} title="[عنوان]" />, { locale: 'ar' });
    expect(flatStyle(screen.getByTestId(`${TEST_ID}-back-icon`, { includeHiddenElements: true }).props.style)).toMatchObject({
      transform: [{ scaleX: -1 }],
    });
  });

  it('calls onBack', async () => {
    const onBack = jest.fn();
    await renderUi(<HadithListHeader onBack={onBack} title="[عنوان]" />);
    await press(screen.getByRole('button', { name: 'رجوع' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders the trailing node', async () => {
    await renderUi(<HadithListHeader onBack={jest.fn()} title="[عنوان]" trailing={<Text>[بحث]</Text>} />);
    expect(screen.getByText('[بحث]')).toBeOnTheScreen();
  });

  it('uses start and end, never left and right', async () => {
    await renderUi(<HadithListHeader onBack={jest.fn()} title="[عنوان]" />);
    expect(physicalSides(flatStyle(screen.getByTestId(TEST_ID).props.style))).toEqual([]);
  });

  it.each(['light', 'sepia', 'dark'] as const)('reads its colours from the theme (%s)', async (theme) => {
    await renderUi(<HadithListHeader onBack={jest.fn()} subtitle="[فرعي]" title="[عنوان]" />, { theme });
    expect(flatStyle(screen.getByTestId(`${TEST_ID}-subtitle`).props.style).color).toBe(themes[theme].colors.inkMuted);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/hadith/components/HadithListHeader.tsx')).toEqual([]);
  });

  it('keeps text scalable and unclipped at the largest size', async () => {
    await renderUi(<HadithListHeader onBack={jest.fn()} title="[عنوان]" />);
    expect(screen.getByTestId(`${TEST_ID}-title`).props.maxFontSizeMultiplier).toBe(maxFontScale.content);
    expect(flatStyle(screen.getByTestId(`${TEST_ID}-title`).props.style)).not.toHaveProperty('height');
  });

  it('wraps the title in full, with no two-line clamp, so Dynamic Type never cuts it short', async () => {
    await renderUi(<HadithListHeader onBack={jest.fn()} title="[اسم]" />);
    expect(screen.getByTestId('hadith-list-header-title').props.numberOfLines).toBeUndefined();
  });
});
