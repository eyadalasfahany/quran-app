import { fireEvent } from '@testing-library/react-native';
import { Platform, Text } from 'react-native';

import { locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { switchThumbColor, ToggleRow } from './ToggleRow';

describe('ToggleRow by platform (ADR 0012 §7: toggles use the platform Switch)', () => {
  let platform: { restore: () => void } | undefined;

  afterEach(() => {
    platform?.restore();
    platform = undefined;
  });

  it('leaves the iOS switch thumb to the system, so it keeps the native look in both states', async () => {
    platform = jest.replaceProperty(Platform, 'OS', 'ios');

    const off = await renderUi(<ToggleRow onValueChange={() => undefined} testID="toggle" title="الإشعارات" value={false} />);
    expect(off.getByRole('switch', { name: 'الإشعارات' }).props.thumbColor).toBeUndefined();
    expect(off.getByRole('switch', { name: 'الإشعارات' }).props.ios_backgroundColor).toBeDefined();
    off.unmount();

    const on = await renderUi(<ToggleRow onValueChange={() => undefined} testID="toggle" title="الإشعارات" value />);
    expect(on.getByRole('switch', { name: 'الإشعارات' }).props.thumbColor).toBeUndefined();
  });

  it('draws the Android off thumb in ink-muted and the on thumb in surface-raised', async () => {
    platform = jest.replaceProperty(Platform, 'OS', 'android');

    const { colors } = themes.light;
    const off = await renderUi(<ToggleRow onValueChange={() => undefined} title="الإشعارات" value={false} />);
    expect(off.getByRole('switch', { name: 'الإشعارات' }).props.thumbColor).toBe(colors.inkMuted);
    off.unmount();

    const on = await renderUi(<ToggleRow onValueChange={() => undefined} title="الإشعارات" value />);
    expect(on.getByRole('switch', { name: 'الإشعارات' }).props.thumbColor).toBe(colors.surfaceRaised);
  });

  it('reports the new value on iOS when the switch is flipped', async () => {
    platform = jest.replaceProperty(Platform, 'OS', 'ios');
    const onValueChange = jest.fn();
    const view = await renderUi(<ToggleRow onValueChange={onValueChange} title="الإشعارات" value={false} />);

    fireEvent(view.getByRole('switch', { name: 'الإشعارات' }), 'valueChange', true);

    expect(onValueChange).toHaveBeenCalledWith(true);
  });
});

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
