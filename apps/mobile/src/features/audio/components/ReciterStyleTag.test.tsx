import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { themes } from '@/core/theme';

import { ReciterStyleTag } from './ReciterStyleTag';

const colors = themes.light.colors;

describe('ReciterStyleTag', () => {
  it('shows the style label in gold ink inside a hairline pill', async () => {
    const view = await renderUi(<ReciterStyleTag label="مرتّل" testID="tag" />);

    expect(view.getByText('مرتّل')).toBeOnTheScreen();
    expect(flatStyle(view.getByTestId('tag').props.style)).toMatchObject({
      borderColor: colors.line,
      borderRadius: 10,
      borderWidth: 1,
    });
    expect(flatStyle(view.getByText('مرتّل').props.style).color).toBe(colors.goldInk);
  });

  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderUi(<ReciterStyleTag label="Murattal" testID="tag" />, { locale });

    expect(view.getByTestId('tag')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/audio/components/ReciterStyleTag.tsx')).toEqual([]);
  });
});
