import { screen } from '@testing-library/react-native';

import { press } from '../../../../jest/azkar-ui-fixtures';
import { renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { AzkarRecentSearches } from './AzkarRecentSearches';

function renderRecent(queries: string[] = ['الصباح', 'المساء'], locale: 'ar' | 'en' = 'ar') {
  const handlers = { onSelect: jest.fn(), onRemove: jest.fn(), onClear: jest.fn() };
  return {
    ...handlers,
    ui: <AzkarRecentSearches queries={queries} {...handlers} />,
    locale,
  };
}

describe('AzkarRecentSearches', () => {
  it('renders nothing without recent queries', async () => {
    const { ui } = renderRecent([]);
    await renderUi(ui);

    expect(screen.queryByTestId('azkar-recent-searches')).toBeNull();
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

  it('renders the English labels', async () => {
    const { ui } = renderRecent(['morning'], 'en');
    await renderUi(ui, { locale: 'en' });

    expect(screen.getByRole('button', { name: 'Clear history' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Remove morning' })).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/azkar/components/AzkarRecentSearches.tsx')).toEqual([]);
  });
});
