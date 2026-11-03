import { renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { TafsirStorageRow } from './TafsirStorageRow';

describe('TafsirStorageRow', () => {
  it('shows Arabic name and pack size', async () => {
    const view = await renderUi(
      <TafsirStorageRow nameAr="FIXTURE tafsir label" packSizeBytes={2 * 1024 * 1024} resourceId={42} testID="tafsir" />,
    );
    expect(view.getByText('FIXTURE tafsir label')).toBeOnTheScreen();
    expect(view.getByText('٢ م.ب')).toBeOnTheScreen();
  });

  it('falls back to resource id when name is null', async () => {
    const view = await renderUi(
      <TafsirStorageRow nameAr={null} packSizeBytes={1024} resourceId={99} testID="tafsir" />,
    );
    expect(view.getByText('99')).toBeOnTheScreen();
  });

  it.each(['ar', 'en'] as const)('renders under %s', async (locale) => {
    const view = await renderUi(
      <TafsirStorageRow nameAr="FIXTURE tafsir label" packSizeBytes={1024} resourceId={1} testID="tafsir" />,
      { locale },
    );
    expect(view.getByTestId('tafsir')).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours in source', () => {
    expect(rawColorLiteralsInFeature('src/features/downloads/components/TafsirStorageRow.tsx')).toEqual([]);
  });
});
