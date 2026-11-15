import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { themes } from '@/core/theme';

import { ListSectionHeader } from './ListSectionHeader';

describe('ListSectionHeader', () => {
  it.each(locales)('a stage shows its name and its range (%s)', async (locale) => {
    await renderUi(<ListSectionHeader detail="من ٤٠ إلى ٦٣ سنة" title="الكهولة" variant="stage" />, { locale });
    expect(screen.getByRole('header')).toHaveTextContent('الكهولة');
    expect(screen.getByText('من ٤٠ إلى ٦٣ سنة')).toBeOnTheScreen();
  });

  it('an age is a small gold heading', async () => {
    await renderUi(<ListSectionHeader title="عمره ٦١ سنة" variant="age" />);
    const heading = screen.getByRole('header');
    expect(heading).toHaveTextContent('عمره ٦١ سنة');
    expect(flatStyle(heading.props.style).color).toBe(themes.light.colors.goldInk);
  });

  it('the unspecified bucket shows its count and the book-order note', async () => {
    await renderUi(<ListSectionHeader detail="١٢ حدثًا" note="أحداث لم يذكر الكتاب وقتها، بترتيب الكتاب." title="غير محدد" variant="unspecified" />);
    expect(screen.getByText('١٢ حدثًا')).toBeOnTheScreen();
    expect(screen.getByText('أحداث لم يذكر الكتاب وقتها، بترتيب الكتاب.')).toBeOnTheScreen();
  });

  it('leaves out the detail and the note when there are none', async () => {
    await renderUi(<ListSectionHeader title="الشباب" variant="stage" />);
    expect(screen.getAllByRole('header')).toHaveLength(1);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/ListSectionHeader.tsx')).toEqual([]);
  });
});
