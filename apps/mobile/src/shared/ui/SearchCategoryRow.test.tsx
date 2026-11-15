import { screen } from '@testing-library/react-native';

import { press } from '../../../jest/azkar-ui-fixtures';
import { rawColorLiteralsInFeature } from '../../../jest/feature-ui-source';
import { renderUi } from '../../../jest/render-ui';

import { SearchCategoryRow } from './SearchCategoryRow';

const TITLE = 'أذكار الصباح والمساء';

describe('SearchCategoryRow', () => {
  it('shows the title, its count, and a button labelled with both', async () => {
    await renderUi(<SearchCategoryRow countText="١٢ ذكرًا" highlight={null} onPress={jest.fn()} title={TITLE} />);

    expect(screen.getByRole('button', { name: `${TITLE}، ١٢ ذكرًا` })).toBeOnTheScreen();
    expect(screen.getByTestId('search-category-row-count')).toHaveTextContent('١٢ ذكرًا');
  });

  it('puts the matched range in its own highlighted text run', async () => {
    const start = TITLE.indexOf('الصباح');
    await renderUi(<SearchCategoryRow countText="٢٤" highlight={{ end: start + 6, start }} onPress={jest.fn()} title={TITLE} />);

    expect(screen.getByText('الصباح')).toBeOnTheScreen();
  });

  it('opens the category on press', async () => {
    const onPress = jest.fn();
    await renderUi(<SearchCategoryRow countText="٢٤" highlight={null} onPress={onPress} title={TITLE} />);

    await press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders the English label', async () => {
    await renderUi(<SearchCategoryRow countText="24 items" highlight={null} onPress={jest.fn()} title="Morning" />, { locale: 'en' });

    expect(screen.getByRole('button', { name: 'Morning, 24 items' })).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/shared/ui/SearchCategoryRow.tsx')).toEqual([]);
  });
});
