import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { collectionFixture } from '../../../../jest/hadith-ui-fixtures';
import { themes } from '@/core/theme';

import { HadithScopeChips } from './HadithScopeChips';

const TEST_ID = 'hadith-scope-chips';
const SECOND = collectionFixture({ slug: 'fixture-b', number: 2, titleAr: '[مجموعة ثانية]', titleEn: '[Second]' });
const FIRST = collectionFixture({ slug: 'fixture-a', number: 1, titleAr: '[مجموعة أولى]', titleEn: '[First]' });

function renderChips(scope: string | null = null, onChange = jest.fn(), locale: 'ar' | 'en' = 'ar') {
  return {
    onChange,
    view: renderUi(<HadithScopeChips collections={[SECOND, FIRST]} onChange={onChange} scope={scope} />, { locale }),
  };
}

describe('HadithScopeChips', () => {
  it.each(locales)('renders in Arabic and English (%s)', async (locale) => {
    const { view } = renderChips(null, jest.fn(), locale);
    await view;
    expect(screen.getByLabelText(locale === 'ar' ? 'نوع النتائج' : 'Search in')).toHaveProp('accessibilityRole', 'radiogroup');
    expect(screen.getByRole('radio', { name: locale === 'ar' ? 'الكل' : 'All' })).toBeOnTheScreen();
  });

  it('shows All then one chip per collection in the given order', async () => {
    await renderChips().view;
    const order = screen.getAllByRole('radio').map((node) => node.props.accessibilityLabel);
    expect(order).toEqual(['الكل', '[مجموعة أولى]', '[مجموعة ثانية]']);
  });

  it('marks the selected chip', async () => {
    await renderChips('fixture-b').view;
    expect(screen.getByRole('radio', { name: '[مجموعة ثانية]' }).props.accessibilityState).toEqual({ checked: true });
    expect(screen.getByRole('radio', { name: 'الكل' }).props.accessibilityState).toEqual({ checked: false });
  });

  it('tapping a chip calls onChange with its slug', async () => {
    const { onChange, view } = renderChips();
    await view;
    await press(screen.getByTestId(`${TEST_ID}-fixture-a`));
    expect(onChange).toHaveBeenCalledWith('fixture-a');
  });

  it('tapping All calls onChange with null', async () => {
    const { onChange, view } = renderChips('fixture-a');
    await view;
    await press(screen.getByTestId(`${TEST_ID}-all`));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('chips have the radio role and a 44 point target', async () => {
    await renderChips().view;
    for (const radio of screen.getAllByRole('radio')) {
      expect(flatStyle(radio.props.style).minHeight).toBe(44);
    }
  });

  it('uses theme colours only', async () => {
    await renderChips('fixture-a').view;
    expect(flatStyle(screen.getByRole('radio', { name: '[مجموعة أولى]' }).props.style).backgroundColor).toBe(
      themes.light.colors.brandSurface,
    );
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/hadith/components/HadithScopeChips.tsx')).toEqual([]);
  });
});
