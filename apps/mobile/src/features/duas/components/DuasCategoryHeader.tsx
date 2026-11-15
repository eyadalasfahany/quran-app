import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { IconButton, UiText } from '@/shared/ui';

const BACK = { ios: 'chevron.left', android: 'chevron_left' } as const;

/**
 * The header of a Duas screen (screens/, #DuasHomeCategories and #DuasCategory): a raised back button at the start, the
 * title at the Azkar header size (28 pt, displayMd), an optional muted line under it (the count, «٢٨ دعاءً»), and
 * optional trailing controls.
 */
export function DuasCategoryHeader({
  title,
  subtitle,
  onBack,
  trailing,
  testID = 'duas-category-header',
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
    <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[2] }} testID={testID}>
      <IconButton
        icon={BACK}
        label={t('common.back')}
        mirrorInRtl
        onPress={onBack}
        testID={`${testID}-back`}
        variant="raised"
      />
      <View style={{ flex: 1, minWidth: 0 }}>
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
