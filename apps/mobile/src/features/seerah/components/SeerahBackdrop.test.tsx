import { screen } from '@testing-library/react-native';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';

import { SeerahBackdrop } from './SeerahBackdrop';

describe('SeerahBackdrop', () => {
  it.each(locales)('draws the art and hides it from screen readers (%s)', async (locale) => {
    await renderUi(<SeerahBackdrop />, { locale });
    const root = screen.getByTestId('seerah-backdrop', { includeHiddenElements: true });
    expect(root.props.accessibilityElementsHidden).toBe(true);
    expect(root.props.pointerEvents).toBe('none');
  });

  it('draws nothing but the background for a level without art', async () => {
    await renderUi(<SeerahBackdrop levelId="nowhere" />);
    expect(flatStyle(screen.getByTestId('seerah-backdrop', { includeHiddenElements: true }).props.style).overflow).toBe('hidden');
  });

  it('renders in dark', async () => {
    await renderUi(<SeerahBackdrop />, { theme: 'dark' });
    expect(screen.getByTestId('seerah-backdrop', { includeHiddenElements: true })).toBeTruthy();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/SeerahBackdrop.tsx')).toEqual([]);
  });
});
