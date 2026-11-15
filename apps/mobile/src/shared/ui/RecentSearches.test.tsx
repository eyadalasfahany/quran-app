import { screen } from '@testing-library/react-native';

import { press } from '../../../jest/azkar-ui-fixtures';
import { rawColorLiteralsInFeature } from '../../../jest/feature-ui-source';
import { renderUi } from '../../../jest/render-ui';

import { RecentSearches } from './RecentSearches';

const LABELS = {
  title: 'عمليات البحث الأخيرة',
  clearLabel: 'مسح السجل',
  removeLabel: (query: string) => `إزالة ${query}`,
};

function renderRecent(queries: string[] = ['الصباح', 'المساء']) {
  const handlers = { onSelect: jest.fn(), onRemove: jest.fn(), onClear: jest.fn() };
  return { ...handlers, ui: <RecentSearches queries={queries} {...LABELS} {...handlers} /> };
}

describe('RecentSearches', () => {
  it('renders nothing without recent queries', async () => {
    const { ui } = renderRecent([]);
    await renderUi(ui);

    expect(screen.queryByTestId('recent-searches')).toBeNull();
  });

  it('lists each query with the heading and the clear action', async () => {
    const { ui } = renderRecent();
    await renderUi(ui);

    expect(screen.getByRole('header', { name: 'عمليات البحث الأخيرة' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'الصباح' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'مسح السجل' })).toBeOnTheScreen();
  });

  it('selects a query when its row is pressed', async () => {
    const { ui, onSelect } = renderRecent();
    await renderUi(ui);

    await press(screen.getByRole('button', { name: 'المساء' }));
    expect(onSelect).toHaveBeenCalledWith('المساء');
  });

  it('removes one query and clears all', async () => {
    const { ui, onRemove, onClear } = renderRecent();
    await renderUi(ui);

    await press(screen.getByRole('button', { name: 'إزالة الصباح' }));
    expect(onRemove).toHaveBeenCalledWith('الصباح');

    await press(screen.getByRole('button', { name: 'مسح السجل' }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('uses the English labels the caller passes', async () => {
    await renderUi(
      <RecentSearches
        clearLabel="Clear history"
        onClear={jest.fn()}
        onRemove={jest.fn()}
        onSelect={jest.fn()}
        queries={['morning']}
        removeLabel={(query) => `Remove ${query}`}
        title="Recent searches"
      />,
      { locale: 'en' },
    );

    expect(screen.getByRole('button', { name: 'Clear history' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Remove morning' })).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/shared/ui/RecentSearches.tsx')).toEqual([]);
  });
});
