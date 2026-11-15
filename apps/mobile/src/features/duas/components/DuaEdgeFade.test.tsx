import { screen } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { DuaEdgeFade } from './DuaEdgeFade';

describe('DuaEdgeFade', () => {
  it('renders at the top edge with its height', async () => {
    await renderUi(<DuaEdgeFade edge="top" height={16} testID="fade" />);

    const fade = screen.getByTestId('fade', { includeHiddenElements: true });
    expect(fade.props.style).toEqual(expect.objectContaining({ height: 16, top: 0 }));
  });

  it('renders at the bottom edge when asked', async () => {
    await renderUi(<DuaEdgeFade edge="bottom" height={72} testID="fade" />);

    const fade = screen.getByTestId('fade', { includeHiddenElements: true });
    expect(fade.props.style).toEqual(expect.objectContaining({ bottom: 0, height: 72 }));
  });

  it('takes no touch and is hidden from accessibility', async () => {
    await renderUi(<DuaEdgeFade edge="bottom" height={72} testID="fade" />);

    const fade = screen.getByTestId('fade', { includeHiddenElements: true });
    expect(fade.props.pointerEvents).toBe('none');
    expect(fade.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('renders under Arabic and English', async () => {
    await renderUi(<DuaEdgeFade edge="top" height={16} testID="fade" />, { locale: 'en' });

    expect(screen.getByTestId('fade', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/duas/components/DuaEdgeFade.tsx')).toEqual([]);
  });
});
