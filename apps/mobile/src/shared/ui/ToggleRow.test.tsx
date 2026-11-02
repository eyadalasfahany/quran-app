import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import { locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals, sharedUiDir } from '../../../jest/ui-source';

import { switchThumbColor, ToggleRow } from './ToggleRow';

describe('ToggleRow', () => {
  it('keeps the system thumb on iOS and gives Android an ink-muted off thumb (ADR 0012 §7)', () => {
    const colors = { inkMuted: '#a7b3ad', surfaceRaised: '#172421' };

    expect(switchThumbColor('ios', false, colors)).toBeUndefined();
    expect(switchThumbColor('ios', true, colors)).toBeUndefined();
    expect(switchThumbColor('android', false, colors)).toBe('#a7b3ad');
    expect(switchThumbColor('android', true, colors)).toBe('#172421');
  });

  it('wires ios_backgroundColor, trackColour and switchThumbColor in source (ADR 0012 §7)', () => {
    // RN's Windows Jest host always mounts AndroidSwitch, which drops ios_* / trackColor props, so the
    // contract is asserted on the source and the pure switchThumbColor helper above.
    const source = readFileSync(join(sharedUiDir, 'ToggleRow.tsx'), 'utf8');
    expect(source).toContain('ios_backgroundColor={theme.colors.fillSecondary}');
    expect(source).toContain('thumbColor={switchThumbColor(Platform.OS, value, theme.colors)}');
    expect(source).toContain('trackColor={{ false: theme.colors.fillSecondary, true: theme.colors.brand }}');
  });

  it('renders a labelled platform switch with its state', async () => {
    const view = await renderUi(<ToggleRow onValueChange={() => undefined} testID="toggle" title="ترجمة ٢٠" value />);
    const toggle = view.getByTestId('toggle');

    expect(toggle.props.value).toBe(true);
    expect(toggle.props.accessibilityState).toEqual({ checked: true });
    expect(toggle.props.accessibilityLabel).toBe('ترجمة ٢٠');
  });

  it('includes the subtitle in the label', async () => {
    const view = await renderUi(
      <ToggleRow onValueChange={() => undefined} testID="toggle" subtitle="صحيح انترناشونال" title="الإنجليزية" value={false} />,
    );

    expect(view.getByTestId('toggle').props.accessibilityLabel).toBe('الإنجليزية, صحيح انترناشونال');
  });

  it('reports a change', async () => {
    const onValueChange = jest.fn();
    const view = await renderUi(<ToggleRow onValueChange={onValueChange} testID="toggle" title="t" value={false} />);

    await fireEvent(view.getByTestId('toggle'), 'valueChange', true);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('draws an accessory before the switch and keeps the switch working', async () => {
    const onValueChange = jest.fn();
    const view = await renderUi(
      <ToggleRow
        accessory={<Text>زر إضافي</Text>}
        onValueChange={onValueChange}
        testID="toggle"
        title="t"
        value={false}
      />,
    );

    expect(view.getByText('زر إضافي')).toBeOnTheScreen();
    await fireEvent(view.getByTestId('toggle'), 'valueChange', true);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderUi(<ToggleRow onValueChange={() => undefined} testID="toggle" title="title" value />, {
      locale,
    });

    expect(view.getByTestId('toggle')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('ToggleRow.tsx')).toEqual([]);
  });
});
