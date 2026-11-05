import { fireEvent, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { displayText } from '@/shared/ui';
import { MyDuaField } from './MyDuaField';

const FIXTURE_LABEL = 'FIXTURE label';
const FIXTURE_VALUE = '  FIXTURE text 1 — not a dua  ';

describe('MyDuaField', () => {
  it('renders the caption and the input with its label', async () => {
    await renderUi(<MyDuaField label={FIXTURE_LABEL} onChangeText={jest.fn()} placeholder="FIXTURE hint" testID="field" value="" />);
    expect(screen.getByText(FIXTURE_LABEL)).toBeOnTheScreen();
    expect(screen.getByLabelText(FIXTURE_LABEL)).toBeOnTheScreen();
  });

  it('passes the value through and reports changes unaltered', async () => {
    const onChangeText = jest.fn();
    await renderUi(<MyDuaField label={FIXTURE_LABEL} onChangeText={onChangeText} placeholder="FIXTURE hint" testID="field" value={FIXTURE_VALUE} />);
    expect(screen.getByTestId('field-input').props.value).toBe(FIXTURE_VALUE);
    fireEvent.changeText(screen.getByTestId('field-input'), FIXTURE_VALUE);
    expect(onChangeText).toHaveBeenCalledWith(FIXTURE_VALUE);
  });

  it('gives a multiline field the 150 to 240 height range and the Amiri face', async () => {
    await renderUi(<MyDuaField label={FIXTURE_LABEL} multiline onChangeText={jest.fn()} placeholder="FIXTURE hint" testID="field" value="" />);
    const style = StyleSheet.flatten(screen.getByTestId('field-input').props.style);
    expect(style.minHeight).toBe(150);
    expect(style.maxHeight).toBe(240);
    expect(style.fontSize).toBe(displayText('dhikrList').fontSize);
  });

  it('gives a single-line field a touch-height minimum and no maximum', async () => {
    await renderUi(<MyDuaField label={FIXTURE_LABEL} onChangeText={jest.fn()} placeholder="FIXTURE hint" testID="field" value="" />);
    const style = StyleSheet.flatten(screen.getByTestId('field-input').props.style);
    expect(style.maxHeight).toBeUndefined();
    expect(style.minHeight).toBeGreaterThan(0);
  });

  it('renders in English layout', async () => {
    await renderUi(<MyDuaField label={FIXTURE_LABEL} onChangeText={jest.fn()} placeholder="FIXTURE hint" testID="field" value="" />, {
      locale: 'en',
    });
    expect(screen.getByLabelText(FIXTURE_LABEL)).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/duas/components/MyDuaField.tsx')).toEqual([]);
  });
});
