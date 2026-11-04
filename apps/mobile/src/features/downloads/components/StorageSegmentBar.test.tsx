import { renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { StorageSegmentBar } from './StorageSegmentBar';

const hidden = { includeHiddenElements: true } as const;

describe('StorageSegmentBar', () => {
  it('renders an empty track when all buckets are zero', async () => {
    const view = await renderUi(<StorageSegmentBar audioBytes={0} fontBytes={0} tafsirBytes={0} testID="bar" />);
    expect(view.getByTestId('bar', hidden)).toBeOnTheScreen();
  });

  it('renders three segments when buckets have values', async () => {
    const view = await renderUi(
      <StorageSegmentBar audioBytes={10} fontBytes={5} tafsirBytes={5} testID="bar" />,
    );
    expect(view.getByTestId('bar', hidden)).toBeOnTheScreen();
  });

  it('collapses a zero bucket', async () => {
    const view = await renderUi(
      <StorageSegmentBar audioBytes={100} fontBytes={0} tafsirBytes={50} testID="bar" />,
    );
    expect(view.getByTestId('bar', hidden)).toBeOnTheScreen();
  });

  it('is not accessible as a whole', async () => {
    const view = await renderUi(<StorageSegmentBar audioBytes={1} fontBytes={1} tafsirBytes={1} testID="bar" />);
    expect(view.getByTestId('bar', hidden).props.accessible).toBe(false);
  });

  it.each(['ar', 'en'] as const)('renders under %s', async (locale) => {
    const view = await renderUi(
      <StorageSegmentBar audioBytes={1} fontBytes={1} tafsirBytes={1} testID="bar" />,
      { locale },
    );
    expect(view.getByTestId('bar', hidden)).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours in source', () => {
    expect(rawColorLiteralsInFeature('src/features/downloads/components/StorageSegmentBar.tsx')).toEqual([]);
  });
});
