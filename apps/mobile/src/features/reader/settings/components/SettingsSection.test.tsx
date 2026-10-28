import { Text } from 'react-native';

import { themes } from '@/core/theme';

import { rawColorLiteralsInFeature } from '../../../../../jest/feature-ui-source';
import { flatStyle, locales, renderUi } from '../../../../../jest/render-ui';
import { SECTION_STACK_GAP, SettingsSection } from './SettingsSection';

describe('SettingsSection', () => {
  it('stacks the muted caption label above its control with a 6 pt gap by default', async () => {
    const view = await renderUi(
      <SettingsSection label="طريقة العرض" testID="section">
        <Text>تحكم</Text>
      </SettingsSection>,
    );

    expect(flatStyle(view.getByTestId('section').props.style)).toMatchObject({ gap: SECTION_STACK_GAP });
    expect(SECTION_STACK_GAP).toBe(6);
    expect(flatStyle(view.getByText('طريقة العرض').props.style)).toMatchObject({
      color: themes.light.colors.inkMuted,
      fontSize: 13,
    });
    expect(view.getByText('تحكم')).toBeOnTheScreen();
  });

  it('lays the inline layout out as a row with the label at the start and the control at the end', async () => {
    const view = await renderUi(
      <SettingsSection label="حجم خط المصحف" layout="inline" testID="section">
        <Text>تحكم</Text>
      </SettingsSection>,
    );

    expect(flatStyle(view.getByTestId('section').props.style)).toMatchObject({
      alignItems: 'center',
      flexDirection: 'row',
      gap: themes.light.space[3],
      justifyContent: 'space-between',
    });
  });

  it('links the label to the control it describes', async () => {
    const view = await renderUi(
      <SettingsSection label="المظهر" testID="section">
        <Text>تحكم</Text>
      </SettingsSection>,
    );

    const labelId = view.getByText('المظهر').props.nativeID;
    expect(labelId).toEqual(expect.any(String));
    expect(view.getByTestId('section-control').props.accessibilityLabelledBy).toBe(labelId);
  });

  it('gives the label and control their own test ids for the inner blocks', async () => {
    const view = await renderUi(
      <SettingsSection label="المظهر" testID="section">
        <Text>تحكم</Text>
      </SettingsSection>,
    );

    expect(view.getByTestId('section-label')).toHaveTextContent('المظهر');
    expect(view.getByTestId('section-control')).toBeOnTheScreen();
  });

  it.each(locales)('renders the label and control in %s', async (locale) => {
    const view = await renderUi(
      <SettingsSection label={locale} layout="inline">
        <Text>{locale}-control</Text>
      </SettingsSection>,
      { locale },
    );

    expect(view.getByText(locale)).toBeOnTheScreen();
    expect(view.getByText(`${locale}-control`)).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/reader/settings/components/SettingsSection.tsx')).toEqual([]);
  });
});
