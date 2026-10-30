import { fireEvent } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { themes } from '@/core/theme';

import { MiniPlayerCapsule } from './MiniPlayerCapsule';

// The switch-in spring runs on mount and outlives a test; these tests check structure, so the styles are static.
jest.mock('../hooks/useMiniEnter', () => ({ useMiniEnter: () => ({ container: {}, content: {} }) }));

const colors = themes.light.colors;

// The capsule's gesture needs a gesture root above it, as the reader provides.
function capsule(props: { fraction: number; onExpand: () => void; showProgress: boolean }) {
  return (
    <GestureHandlerRootView>
      <MiniPlayerCapsule {...props} />
    </GestureHandlerRootView>
  );
}

describe('MiniPlayerCapsule', () => {
  it('draws a 64 by 24 glass pill with a 28 by 4 grabber in lineStrong', async () => {
    const view = await renderUi(capsule({ fraction: 0, onExpand: () => undefined, showProgress: false }));

    expect(flatStyle(view.getByTestId('mini-player-capsule-glass').props.style)).toMatchObject({ height: 24, width: 64 });
    expect(flatStyle(view.getByTestId('mini-player-capsule-grabber').props.style)).toMatchObject({
      backgroundColor: colors.lineStrong,
      height: 4,
      width: 28,
    });
  });

  it('keeps a 44 pt hit area, 88 wide', async () => {
    const view = await renderUi(capsule({ fraction: 0, onExpand: () => undefined, showProgress: false }));

    expect(flatStyle(view.getByTestId('mini-player-capsule').props.style)).toMatchObject({ height: 44, width: 88 });
  });

  it('expands when tapped', async () => {
    const onExpand = jest.fn();
    const view = await renderUi(capsule({ fraction: 0, onExpand, showProgress: false }));

    fireEvent.press(view.getByRole('button', { name: 'إظهار المشغّل' }));
    expect(onExpand).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('is labelled to show the player in %s', async (locale) => {
    const view = await renderUi(capsule({ fraction: 0, onExpand: () => undefined, showProgress: false }), { locale });
    const label = locale === 'ar' ? 'إظهار المشغّل' : 'Show player';

    expect(view.getByRole('button', { name: label })).toBeOnTheScreen();
  });

  it('draws the gold progress line from the start edge while playing', async () => {
    const view = await renderUi(capsule({ fraction: 0.4, onExpand: () => undefined, showProgress: true }));
    const fill = flatStyle(view.getByTestId('mini-player-progress-fill', { includeHiddenElements: true }).props.style);

    expect(fill.width).toBe('40%');
    expect(fill.backgroundColor).toBe(colors.gold);
  });

  it('draws no progress line when showProgress is off (idle)', async () => {
    const view = await renderUi(capsule({ fraction: 0.4, onExpand: () => undefined, showProgress: false }));

    expect(view.queryByTestId('mini-player-progress', { includeHiddenElements: true })).toBeNull();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/audio/components/MiniPlayerCapsule.tsx')).toEqual([]);
  });
});
