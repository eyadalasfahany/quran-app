import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { IconButton, UiText } from '@/shared/ui';

const BACK = { ios: 'chevron.left', android: 'chevron_left' } as const;
// The frames' Duas title: 26 px, which is not a type-scale step (line height 34 keeps Amiri's marks clear).
const TITLE = { size: 26, lineHeight: 34 } as const;

/**
 * The header of a Duas screen (screens/, #DuasHomeCategories and #DuasCategory): a raised back button at the start, the
 * Amiri title, an optional muted line under it («٢٨ دعاءً · القرآن»), and optional trailing controls.
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
        <UiText accessibilityRole="header" style={{ fontSize: TITLE.size, lineHeight: TITLE.lineHeight }} variant="displayMd">
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
