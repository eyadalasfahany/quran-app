import { Text } from 'react-native';
import { makeMutable } from 'react-native-reanimated';

import { flatStyle, renderUi } from '../../../../jest/render-ui';

import { LABEL_CLEARANCE_DEGREES, LABEL_FADED_OPACITY, QiblaLabelClearance, labelOpacityFor } from './QiblaLabelClearance';

describe('labelOpacityFor', () => {
  it('fades the label the marker sits on, and leaves far labels at full opacity', () => {
    expect(labelOpacityFor(0, 0)).toBe(LABEL_FADED_OPACITY);
    expect(labelOpacityFor(90, 0)).toBe(1);
    expect(labelOpacityFor(LABEL_CLEARANCE_DEGREES, 0)).toBe(1);
  });

  it('eases back in between, and measures across north (359 is one degree from 0)', () => {
    const half = labelOpacityFor(LABEL_CLEARANCE_DEGREES / 2, 0);
    expect(half).toBeGreaterThan(LABEL_FADED_OPACITY);
    expect(half).toBeLessThan(1);
    expect(labelOpacityFor(359, 0)).toBeCloseTo(labelOpacityFor(1, 0));
    // An accumulated angle (two full turns plus 90) still fades the east label.
    expect(labelOpacityFor(810, 90)).toBe(LABEL_FADED_OPACITY);
  });
});

describe('QiblaLabelClearance', () => {
  it('renders its label, untouchable, and fades it under the marker', async () => {
    const view = await renderUi(
      <QiblaLabelClearance angle={makeMutable(0)} degrees={0} style={{ height: 22, width: 40 }} testID="label">
        <Text>ش</Text>
      </QiblaLabelClearance>,
    );
    const label = view.getByTestId('label');

    expect(view.getByText('ش')).toBeOnTheScreen();
    expect(label.props.pointerEvents).toBe('none');
    expect(flatStyle(label.props.style).opacity).toBe(LABEL_FADED_OPACITY);
  });

  it('stays fully visible with no marker angle (static use)', async () => {
    const view = await renderUi(
      <QiblaLabelClearance degrees={0} style={{ height: 22, width: 40 }} testID="label">
        <Text>N</Text>
      </QiblaLabelClearance>,
    );

    expect(flatStyle(view.getByTestId('label').props.style).opacity).toBe(1);
  });
});
