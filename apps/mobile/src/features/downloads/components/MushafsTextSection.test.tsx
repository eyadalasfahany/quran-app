import { renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { MushafsTextSection } from './MushafsTextSection';

describe('MushafsTextSection', () => {
  it('renders Hafs row only when no tafsirs', async () => {
    const view = await renderUi(<MushafsTextSection tafsirs={[]} testID="mushaf" />);
    expect(view.getByRole('header', { name: 'النصوص' })).toBeOnTheScreen();
    expect(view.getByTestId('mushaf-hafs')).toBeOnTheScreen();
    expect(view.queryByTestId(/mushaf-tafsir-/)).toBeNull();
  });

  it('renders one tafsir row', async () => {
    const view = await renderUi(
      <MushafsTextSection
        tafsirs={[{ resourceId: 7, nameAr: 'FIXTURE tafsir', packSizeBytes: 1024 }]}
        testID="mushaf"
      />,
    );
    expect(view.getByTestId('mushaf-tafsir-7')).toBeOnTheScreen();
  });

  it('renders two tafsir rows', async () => {
    const view = await renderUi(
      <MushafsTextSection
        tafsirs={[
          { resourceId: 1, nameAr: 'FIXTURE a', packSizeBytes: 1024 },
          { resourceId: 2, nameAr: 'FIXTURE b', packSizeBytes: 2048 },
        ]}
        testID="mushaf"
      />,
    );
    expect(view.getByTestId('mushaf-tafsir-1')).toBeOnTheScreen();
    expect(view.getByTestId('mushaf-tafsir-2')).toBeOnTheScreen();
  });

  it.each(['ar', 'en'] as const)('renders under %s', async (locale) => {
    const view = await renderUi(<MushafsTextSection tafsirs={[]} testID="mushaf" />, { locale });
    expect(view.getByTestId('mushaf')).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours in source', () => {
    expect(rawColorLiteralsInFeature('src/features/downloads/components/MushafsTextSection.tsx')).toEqual([]);
  });
});
