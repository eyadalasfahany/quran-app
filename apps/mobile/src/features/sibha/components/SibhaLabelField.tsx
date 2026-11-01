import { useTranslation } from 'react-i18next';
import { TextInput } from 'react-native';

import { useTheme } from '@/core/theme';
import { uiTextProps, useContrastColors } from '@/shared/ui';

import { SIBHA_LABEL_MAX } from '../data/model';

/**
 * The optional label (quran-app-screens.html, #Sibha): one centred line the user types for this counter. The app
 * suggests no words; the placeholder only says the field is optional.
 */
export function SibhaLabelField({
  value,
  onChangeText,
  testID = 'sibha-label',
}: {
  value: string;
  onChangeText: (text: string) => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();

  return (
    <TextInput
      {...uiTextProps('body')}
      accessibilityLabel={t('sibha.labelA11y')}
      autoCorrect={false}
      maxLength={SIBHA_LABEL_MAX}
      onChangeText={onChangeText}
      placeholder={t('sibha.label')}
      placeholderTextColor={colors.inkMuted}
      returnKeyType="done"
      style={{
        color: theme.colors.ink,
        minHeight: theme.size.touchTarget,
        paddingHorizontal: theme.space[4],
        textAlign: 'center',
      }}
      testID={testID}
      value={value}
    />
  );
}
