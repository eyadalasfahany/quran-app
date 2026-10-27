import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { PageDivider } from './PageDivider';

describe('PageDivider', () => {
  it('renders the page place in muted label type between two rules', async () => {
    const view = await renderUi(<PageDivider label="صفحة ٢ · الجزء ١" testID="break" />);
    const label = view.getByText('صفحة ٢ · الجزء ١');

    expect(flatStyle(label.props.style)).toMatchObject({ ...themes.light.text.label, color: themes.light.colors.inkMuted });
    expect(view.getByTestId('break').children).toHaveLength(3);
  });

  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderUi(<PageDivider label="Page 2" />, { locale });

    expect(view.getByText('Page 2')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('PageDivider.tsx')).toEqual([]);
  });
});
