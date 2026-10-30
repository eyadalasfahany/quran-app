import { View } from 'react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { SettingsGroup } from './SettingsGroup';

describe('SettingsGroup', () => {
  it('renders title and children in a rounded container', async () => {
    const view = await renderUi(
      <SettingsGroup testID="group" title="القراءة">
        <View testID="child-content" />
      </SettingsGroup>,
    );

    expect(view.getByRole('header', { name: 'القراءة' })).toBeOnTheScreen();
    expect(view.getByTestId('child-content')).toBeOnTheScreen();
  });

  it('renders without title when omitted', async () => {
    const view = await renderUi(
      <SettingsGroup testID="group">
        <View testID="child-content" />
      </SettingsGroup>,
    );

    expect(view.queryByRole('header')).toBeNull();
    expect(view.getByTestId('child-content')).toBeOnTheScreen();
  });

  it.each(locales)('renders correctly under %s', async (locale) => {
    const title = locale === 'en' ? 'Reading' : 'القراءة';
    const view = await renderUi(
      <SettingsGroup title={title}>
        <View testID="child" />
      </SettingsGroup>,
      { locale },
    );

    expect(view.getByRole('header', { name: title })).toBeOnTheScreen();
    expect(view.getByTestId('child')).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/settings/components/SettingsGroup.tsx')).toEqual([]);
  });
});

