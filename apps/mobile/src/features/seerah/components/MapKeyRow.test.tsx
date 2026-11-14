import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { themes } from '@/core/theme';

import { Text } from 'react-native';

import { MapKeyRow } from './MapKeyRow';

describe('MapKeyRow', () => {
  it.each(locales)('shows the title and the hint, and reads them as one (%s)', async (locale) => {
    await renderUi(<MapKeyRow hint="الحلقة الذهبية" symbol={<Text>S</Text>} title="مدينة لها خريطة" />, { locale });
    expect(screen.getByText('مدينة لها خريطة')).toBeOnTheScreen();
    expect(screen.getByText('الحلقة الذهبية')).toBeOnTheScreen();
    expect(screen.getByLabelText('مدينة لها خريطة، الحلقة الذهبية')).toBeOnTheScreen();
  });

  it('draws the symbol as an untouchable decoration', async () => {
    await renderUi(<MapKeyRow hint="h" symbol={<Text>sample</Text>} testID="row" title="t" />);
    const symbol = screen.getByTestId('row-symbol', { includeHiddenElements: true });
    expect(symbol.props.accessibilityElementsHidden).toBe(true);
    expect(symbol.props.pointerEvents).toBe('none');
  });

  it('is at least 44 pt tall', async () => {
    await renderUi(<MapKeyRow hint="h" symbol={<Text>S</Text>} testID="row" title="t" />);
    expect(flatStyle(screen.getByTestId('row').props.style).minHeight).toBeGreaterThanOrEqual(44);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/MapKeyRow.tsx')).toEqual([]);
    expect(themes.light.colors.ink).toBeDefined();
  });
});
