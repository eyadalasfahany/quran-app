import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { renderUi } from '../../../../jest/render-ui';
import { ReaderModeFade } from './ReaderModeFade';

describe('ReaderModeFade', () => {
  it('renders its content', async () => {
    const view = await renderUi(
      <ReaderModeFade mode="text">
        <></>
      </ReaderModeFade>,
    );
    expect(view.getByTestId('reader-mode-fade')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/components/ReaderModeFade.tsx')).toEqual([]);
  });
});
