import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { locales, renderUi } from '../../../../jest/render-ui';

import { DiscoverTick } from './DiscoverTick';

describe('DiscoverTick', () => {
  it('renders a filled disc with a check when done', async () => {
    const view = await renderUi(<DiscoverTick done testID="tick" />);
    expect(view.getByTestId('tick')).toBeOnTheScreen();
  });

  it('renders an empty ring when not done', async () => {
    const view = await renderUi(<DiscoverTick done={false} testID="tick" />);
    expect(view.getByTestId('tick')).toBeOnTheScreen();
    expect(view.queryByTestId('tick-check')).toBeNull();
  });

  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderUi(<DiscoverTick done testID="tick" />, { locale });
    expect(view.getByTestId('tick')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    const source = readFileSync(join(__dirname, 'DiscoverTick.tsx'), 'utf8');
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
  });
});
