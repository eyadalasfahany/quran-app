import { renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { StorageCard } from './StorageCard';

describe('StorageCard', () => {
  it('shows loading ellipsis for total', async () => {
    const view = await renderUi(
      <StorageCard audioBytes={0} fontBytes={0} loading tafsirBytes={0} totalBytes={0} testID="card" />,
    );
    expect(view.getByText('…')).toBeOnTheScreen();
  });

  it('shows formatted totals when not loading', async () => {
    const view = await renderUi(
      <StorageCard
        audioBytes={5 * 1024 * 1024}
        fontBytes={2 * 1024 * 1024}
        loading={false}
        tafsirBytes={1 * 1024 * 1024}
        totalBytes={8 * 1024 * 1024}
        testID="card"
      />,
    );
    expect(view.getByText('المساحة المستخدمة')).toBeOnTheScreen();
    expect(view.getByText('٨ م.ب')).toBeOnTheScreen();
  });

  it('exposes a storage summary accessibility label', async () => {
    const view = await renderUi(
      <StorageCard audioBytes={0} fontBytes={0} loading={false} tafsirBytes={0} totalBytes={0} testID="card" />,
    );
    const card = view.getByTestId('card');
    expect(card.props.accessibilityLabel).toContain('المساحة المستخدمة');
  });

  it.each(['ar', 'en'] as const)('renders under %s', async (locale) => {
    const view = await renderUi(
      <StorageCard audioBytes={0} fontBytes={0} loading={false} tafsirBytes={0} totalBytes={0} testID="card" />,
      { locale },
    );
    expect(view.getByTestId('card')).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours in source', () => {
    expect(rawColorLiteralsInFeature('src/features/downloads/components/StorageCard.tsx')).toEqual([]);
  });
});
