import { fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { MeasuredRow } from './MeasuredRow';

function layout(height: number) {
  return { nativeEvent: { layout: { height, width: 390, x: 0, y: 0 } } };
}

describe('MeasuredRow', () => {
  it.each(locales)('renders its row in %s', async (locale) => {
    const view = await renderUi(
      <MeasuredRow onHeight={() => undefined} rowKey="ayah-1" testID="row">
        <Text>row</Text>
      </MeasuredRow>,
      { locale },
    );

    expect(view.getByTestId('row')).toHaveTextContent('row');
  });

  it('reports each laid-out height under its row key', async () => {
    const onHeight = jest.fn();
    const view = await renderUi(
      <MeasuredRow onHeight={onHeight} rowKey="ayah-1" testID="row">
        <Text>row</Text>
      </MeasuredRow>,
    );

    await fireEvent(view.getByTestId('row'), 'layout', layout(180));
    await fireEvent(view.getByTestId('row'), 'layout', layout(212));
    expect(onHeight.mock.calls).toEqual([
      ['ayah-1', 180],
      ['ayah-1', 212],
    ]);
  });

  it('adds nothing to the accessibility tree around its row', async () => {
    const view = await renderUi(
      <MeasuredRow onHeight={() => undefined} rowKey="ayah-1" testID="row">
        <Text accessibilityRole="button">row</Text>
      </MeasuredRow>,
    );

    expect(view.getByTestId('row').props.accessibilityRole).toBeUndefined();
    expect(view.getByRole('button', { name: 'row' })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/reader/components/MeasuredRow.tsx')).toEqual([]);
  });
});
