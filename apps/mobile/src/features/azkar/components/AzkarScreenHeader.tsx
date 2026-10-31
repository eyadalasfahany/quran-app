import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { IconButton, UiText } from '@/shared/ui';

const BACK = { ios: 'chevron.left', android: 'chevron_left' } as const;

/**
 * The header of an Azkar screen: a raised back button at the start, the title with an optional subtitle, and a
 * trailing control (for example the favourites and search buttons). Back mirrors in RTL.
 */
export function AzkarScreenHeader({
  title,
  subtitle,
  onBack,
  trailing,
  testID = 'azkar-screen-header',
}: {
  title: string;
  subtitle?: string;
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
        label={t('azkar.browse.back')}
        mirrorInRtl
        onPress={onBack}
        testID={`${testID}-back`}
        variant="raised"
      />
      <View style={{ flex: 1, gap: theme.space[1] }}>
        <UiText accessibilityRole="header" variant="displayMd">
          {title}
        </UiText>
        {subtitle ? (
          <UiText tone="muted" variant="caption">
            {subtitle}
          </UiText>
        ) : null}
      </View>
      {trailing ? <View style={{ flexDirection: 'row', gap: theme.space[2] }}>{trailing}</View> : null}
    </View>
  );
}
