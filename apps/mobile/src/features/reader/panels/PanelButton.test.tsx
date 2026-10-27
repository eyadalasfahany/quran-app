import { fireEvent } from '@testing-library/react-native';

import { themes } from '@/core/theme';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { PanelButton } from './PanelButton';

const colors = themes.light.colors;
const NEXT = { ios: 'chevron.forward', android: 'chevron_right' } as const;

describe('PanelButton', () => {
  it('renders the secondary button with a 44 pt minimum height', async () => {
    const view = await renderUi(<PanelButton label="إلغاء" onPress={jest.fn()} />);
    const button = view.getByRole('button', { name: 'إلغاء' });

    expect(flatStyle(button.props.style)).toMatchObject({ backgroundColor: 'transparent', borderColor: colors.line });
    expect(flatStyle(button.props.style).minHeight).toBeGreaterThanOrEqual(44);
    expect(flatStyle(view.getByText('إلغاء').props.style).color).toBe(colors.ink);
  });

  it('renders the primary and danger variants', async () => {
    const primary = await renderUi(<PanelButton label="Save" onPress={jest.fn()} variant="primary" />, { locale: 'en' });
    expect(flatStyle(primary.getByRole('button').props.style).backgroundColor).toBe(colors.brand);
    expect(flatStyle(primary.getByText('Save').props.style).color).toBe(colors.onBrand);
    await primary.unmount();

    const danger = await renderUi(<PanelButton label="Delete" onPress={jest.fn()} variant="danger" />, { locale: 'en' });
    expect(flatStyle(danger.getByText('Delete').props.style).color).toBe(colors.danger);
  });

  it('calls onPress, and not when disabled', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<PanelButton label="Next" onPress={onPress} />, { locale: 'en' });
    await fireEvent.press(view.getByRole('button', { name: 'Next' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    await view.unmount();

    const disabled = await renderUi(<PanelButton disabled label="Next" onPress={onPress} />, { locale: 'en' });
    const button = disabled.getByRole('button', { name: 'Next' });
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(button.props.accessibilityState).toEqual({ disabled: true });
  });

  it.each(locales)('lays the icon and label in a row in %s', async (locale) => {
    const view = await renderUi(<PanelButton icon={NEXT} label="label" mirrorIconInRtl onPress={jest.fn()} />, { locale });

    expect(flatStyle(view.getByRole('button').props.style).flexDirection).toBe('row');
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/panels/PanelButton.tsx')).toEqual([]);
  });
});
