import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { SettingsHeader } from './SettingsHeader';

describe('SettingsHeader', () => {
  it('renders default title and back button', async () => {
    const onBack = jest.fn();
    const view = await renderUi(<SettingsHeader onBack={onBack} />);

    expect(view.getByRole('header', { name: 'الإعدادات' })).toBeOnTheScreen();
    const backBtn = view.getByRole('button', { name: 'رجوع' });
    expect(backBtn).toBeOnTheScreen();

    expect(flatStyle(backBtn.props.style).height).toBeGreaterThanOrEqual(44);
    expect(flatStyle(backBtn.props.style).width).toBeGreaterThanOrEqual(44);

    fireEvent.press(backBtn);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders without back button when onBack is omitted', async () => {
    const view = await renderUi(<SettingsHeader />);

    expect(view.getByRole('header', { name: 'الإعدادات' })).toBeOnTheScreen();
    expect(view.queryByRole('button', { name: 'رجوع' })).toBeNull();
  });

  it('accepts custom title', async () => {
    const view = await renderUi(<SettingsHeader title="عنوان مخصص" />);

    expect(view.getByRole('header', { name: 'عنوان مخصص' })).toBeOnTheScreen();
  });

  it.each(locales)('renders correctly under %s', async (locale) => {
    const onBack = jest.fn();
    const view = await renderUi(<SettingsHeader onBack={onBack} />, { locale });

    const expectedTitle = locale === 'en' ? 'Settings' : 'الإعدادات';
    const expectedBack = locale === 'en' ? 'Back' : 'رجوع';

    expect(view.getByRole('header', { name: expectedTitle })).toBeOnTheScreen();
    expect(view.getByRole('button', { name: expectedBack })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/settings/components/SettingsHeader.tsx')).toEqual([]);
  });
});

