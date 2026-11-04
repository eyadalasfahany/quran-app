import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { IconButton, UiText } from '@/shared/ui';

const BACK = { ios: 'chevron.left', android: 'chevron_left' } as const;

export function NamesScreenHeader({
  title,
  onBack,
  trailing,
  testID = 'names-screen-header',
}: {
  title: string;
  onBack: () => void;
  trailing?: ReactNode;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[3] }} testID={testID}>
      <IconButton
        icon={BACK}
        label={t('names.list.back')}
        mirrorInRtl
        onPress={onBack}
        testID={`${testID}-back`}
        variant="raised"
      />
      <View style={{ flex: 1 }}>
        <UiText accessibilityRole="header" variant="displayMd">
          {title}
        </UiText>
      </View>
      {trailing ? <View style={{ flexDirection: 'row', gap: theme.space[2] }}>{trailing}</View> : null}
    </View>
  );
}
