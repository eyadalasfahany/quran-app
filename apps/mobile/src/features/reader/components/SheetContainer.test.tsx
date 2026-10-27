import { fireEvent } from '@testing-library/react-native';

import type { SqlExecutor } from '@/core/db/sql-executor';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { openReaderTestContent } from '../../../../jest/reader-test-db';
import { locales, renderUi } from '../../../../jest/render-ui';
import { SheetContainer } from './SheetContainer';

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(() => Promise.resolve(true)) }));

describe('SheetContainer', () => {
  let executor: SqlExecutor;

  beforeAll(async () => {
    executor = (await openReaderTestContent()).executor;
  });

  it.each(locales)('falls back to the verse key without content in %s', async (locale) => {
    const view = await renderUi(<SheetContainer tab="actions" verseKey="2:255" />, { locale });
    expect(view.getByText('2:255')).toBeOnTheScreen();
    expect(view.getByTestId('sheet-container').props.accessibilityLabel).toBe(locale === 'ar' ? 'خيارات الآية' : 'Ayah actions');
  });

  it('opens on the requested tab and switches tabs', async () => {
    const view = await renderUi(<SheetContainer executor={executor} tab="tafsir" verseKey="1:2" />, { locale: 'en' });

    expect(view.getByText('No tafsir downloaded')).toBeOnTheScreen();
    await fireEvent.press(view.getByRole('tab', { name: 'Translation' }));
    expect(view.getByText('No translation chosen')).toBeOnTheScreen();
  });

  it('reports tab changes and takes the full sheet away from the actions tab', async () => {
    const onTabChange = jest.fn();
    const view = await renderUi(
      <SheetContainer executor={executor} onTabChange={onTabChange} tab="actions" verseKey="1:2" />,
      { locale: 'en' },
    );

    await fireEvent.press(view.getByRole('tab', { name: 'Tafsir' }));

    expect(onTabChange).toHaveBeenCalledWith('tafsir');
  });

  it('moves to the next ayah inside the sheet', async () => {
    const view = await renderUi(<SheetContainer executor={executor} tab="tafsir" verseKey="1:2" />, { locale: 'en' });

    await fireEvent.press(view.getByRole('button', { name: 'Next ayah' }));

    expect(view.getByRole('header', { name: 'الفاتحة · Ayah 3' })).toBeOnTheScreen();
  });

  it('closes from the header', async () => {
    const onClose = jest.fn();
    const view = await renderUi(<SheetContainer executor={executor} onClose={onClose} tab="actions" verseKey="1:2" />, {
      locale: 'en',
    });

    await fireEvent.press(view.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/components/SheetContainer.tsx')).toEqual([]);
  });
});
