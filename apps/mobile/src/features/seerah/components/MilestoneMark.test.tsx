import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { themes } from '@/core/theme';

import { MilestoneMark } from './MilestoneMark';

const hidden = { includeHiddenElements: true } as const;

describe('MilestoneMark', () => {
  it.each(locales)('renders its label (%s)', async (locale) => {
    await renderUi(<MilestoneMark label="الهجرة" part="label" />, { locale });
    expect(screen.getByText('الهجرة', hidden)).toBeOnTheScreen();
  });

  it('draws a gold diamond on the track and no text', async () => {
    await renderUi(<MilestoneMark label="الهجرة" part="diamond" testID="mark" />);
    expect(flatStyle(screen.getByTestId('mark-diamond', hidden).props.style)).toMatchObject({
      backgroundColor: themes.light.colors.gold,
      transform: [{ rotate: '45deg' }],
    });
    expect(screen.queryByText('الهجرة', hidden)).toBeNull();
  });

  it('is decorative and ignores touches', async () => {
    await renderUi(<MilestoneMark label="x" part="label" testID="mark" />);
    const mark = screen.getByTestId('mark', hidden);
    expect(mark.props.accessibilityElementsHidden).toBe(true);
    expect(mark.props.pointerEvents).toBe('none');
  });

  it('fades when dimmed', async () => {
    await renderUi(<MilestoneMark dimmed label="x" part="label" testID="mark" />);
    expect(flatStyle(screen.getByTestId('mark', hidden).props.style).opacity).toBe(themes.light.opacity.disabled);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/MilestoneMark.tsx')).toEqual([]);
  });
});
