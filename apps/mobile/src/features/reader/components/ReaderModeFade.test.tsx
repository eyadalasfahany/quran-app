import { Text } from 'react-native';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { locales, renderUi } from '../../../../jest/render-ui';
import { ReaderModeFade } from './ReaderModeFade';

describe('ReaderModeFade', () => {
  it.each(locales)('renders its content in %s', async (locale) => {
    const view = await renderUi(
      <ReaderModeFade mode="text">
        <Text>page</Text>
      </ReaderModeFade>,
      { locale },
    );
    expect(view.getByTestId('reader-mode-fade')).toHaveTextContent('page');
  });

  it('takes a test ID so a nested fade does not repeat the screen one', async () => {
    const view = await renderUi(
      <ReaderModeFade mode="reading" testID="list-fade">
        <Text>page</Text>
      </ReaderModeFade>,
    );
    expect(view.getByTestId('list-fade')).toBeOnTheScreen();
    expect(view.queryByTestId('reader-mode-fade')).toBeNull();
  });

  it('keeps its content on screen and accessible across a mode change', async () => {
    const view = await renderUi(
      <ReaderModeFade mode="text">
        <Text accessibilityRole="button">page</Text>
      </ReaderModeFade>,
    );
    view.rerender(
      <ReaderModeFade mode="mushaf">
        <Text accessibilityRole="button">page</Text>
      </ReaderModeFade>,
    );
    expect(view.getByRole('button', { name: 'page' })).toBeOnTheScreen();
    expect(view.getByTestId('reader-mode-fade').props.accessibilityRole).toBeUndefined();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/components/ReaderModeFade.tsx')).toEqual([]);
  });
});
