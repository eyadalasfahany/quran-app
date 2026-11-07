import { screen } from '@testing-library/react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';

import { MenuHadithCard } from './MenuHadithCard';

const TEST_ID = 'menu-card-hadith';

describe('MenuHadithCard', () => {
  it.each(locales)('renders in Arabic and English (%s)', async (locale) => {
    await renderUi(<MenuHadithCard onPress={jest.fn()} />, { locale });
    expect(screen.getAllByText(locale === 'ar' ? 'الحديث' : 'Hadith')[0]).toBeOnTheScreen();
    expect(screen.getByText(locale === 'ar' ? 'المجموعات والكتب' : 'Collections and books')).toBeOnTheScreen();
  });

  it('is one button labelled caption, title and preview', async () => {
    await renderUi(<MenuHadithCard onPress={jest.fn()} />);
    expect(screen.getByRole('button', { name: /الأحاديث.*الحديث.*المجموعات والكتب/ })).toBeOnTheScreen();
    expect(screen.getByTestId(TEST_ID)).toBeOnTheScreen();
  });

  it('calls onPress', async () => {
    const onPress = jest.fn();
    await renderUi(<MenuHadithCard onPress={onPress} />);
    await press(screen.getByTestId(TEST_ID));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/hadith/components/MenuHadithCard.tsx')).toEqual([]);
  });
});
