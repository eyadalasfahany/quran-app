import { fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import { locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';

import { switchThumbColor, ToggleRow } from './ToggleRow';

describe('ToggleRow', () => {
  it('renders a labelled platform switch with its state', async () => {
    const view = await renderUi(<ToggleRow onValueChange={() => undefined} testID="toggle" title="ترجمة ٢٠" value />);
    const toggle = view.getByRole('switch', { name: 'ترجمة ٢٠' });

    expect(toggle.props.value).toBe(true);
    expect(toggle.props.accessibilityState).toEqual({ checked: true });
  });

  it('keeps the system thumb on iOS and gives Android an ink-muted off thumb', () => {
    const colors = { inkMuted: '#a7b3ad', surfaceRaised: '#172421' };

    expect(switchThumbColor('ios', false, colors)).toBeUndefined();
    expect(switchThumbColor('ios', true, colors)).toBeUndefined();
    expect(switchThumbColor('android', false, colors)).toBe('#a7b3ad');
    expect(switchThumbColor('android', true, colors)).toBe('#172421');
  });

  it('includes the subtitle in the label', async () => {
    const view = await renderUi(
      <ToggleRow onValueChange={() => undefined} subtitle="صحيح انترناشونال" title="الإنجليزية" value={false} />,
    );

    expect(view.getByRole('switch', { name: 'الإنجليزية, صحيح انترناشونال' })).toBeOnTheScreen();
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
    const view = await renderUi(<ToggleRow onValueChange={() => undefined} title="title" value />, { locale });

    expect(view.getByRole('switch')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('ToggleRow.tsx')).toEqual([]);
  });
});
