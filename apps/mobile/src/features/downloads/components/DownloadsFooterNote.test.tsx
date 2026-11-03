import { renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { DownloadsFooterNote } from './DownloadsFooterNote';

describe('DownloadsFooterNote', () => {
  it('renders the footer copy in Arabic', async () => {
    const view = await renderUi(<DownloadsFooterNote testID="footer" />);
    expect(view.getByTestId('footer')).toBeOnTheScreen();
    expect(view.getByText(/تُحدَّث تلقائيًا/)).toBeOnTheScreen();
  });

  it.each(['ar', 'en'] as const)('renders under %s', async (locale) => {
    const view = await renderUi(<DownloadsFooterNote testID="footer" />, { locale });
    expect(view.getByTestId('footer')).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours in source', () => {
    expect(rawColorLiteralsInFeature('src/features/downloads/components/DownloadsFooterNote.tsx')).toEqual([]);
  });
});
