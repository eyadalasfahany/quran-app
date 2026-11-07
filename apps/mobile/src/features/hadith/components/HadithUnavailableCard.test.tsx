import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { themes } from '@/core/theme';

import { HadithUnavailableCard } from './HadithUnavailableCard';

const TEST_ID = 'hadith-unavailable-card';

describe('HadithUnavailableCard', () => {
  it.each(locales)('renders the note with the number in %s', async (locale) => {
    await renderUi(<HadithUnavailableCard hadithNumber="5730" onPress={jest.fn()} />, { locale });
    const note = locale === 'ar' ? 'الحديث ٥٧٣٠ غير متوفر حاليًا في المصدر' : "Hadith 5730 isn't available in the source yet";
    expect(screen.getByTestId(`${TEST_ID}-note`)).toHaveTextContent(note);
    expect(screen.getByRole('button', { name: note })).toBeOnTheScreen();
  });

  it('shows the number badge and uses the muted tone', async () => {
    await renderUi(<HadithUnavailableCard hadithNumber="5730" onPress={jest.fn()} />);
    expect(screen.getByTestId(`${TEST_ID}-badge-number`, { includeHiddenElements: true })).toHaveTextContent('٥٧٣٠');
    expect(flatStyle(screen.getByTestId(`${TEST_ID}-note`).props.style).color).toBe(themes.light.colors.inkMuted);
  });

  it('calls onPress when tapped', async () => {
    const onPress = jest.fn();
    await renderUi(<HadithUnavailableCard hadithNumber="5730" onPress={onPress} />);
    press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/hadith/components/HadithUnavailableCard.tsx')).toEqual([]);
  });
});
