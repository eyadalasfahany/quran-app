import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { amiriNaturalLeading } from '@quran/design-tokens';
import { IconButton, UiText } from '@/shared/ui';

const BACK = { ios: 'chevron.left', android: 'chevron_left' } as const;

// Frames: the lg title is Amiri 26 (line height at Amiri's natural leading), the md title Amiri 22 over 39.
const LG_TITLE_SIZE = 26;
const MD_TITLE_SIZE = 22;
const MD_TITLE_LINE_HEIGHT = 39;

/** The back button, title and subtitle of a list screen, with an optional trailing control. */
export function HadithListHeader({
  title,
  subtitle,
  titleSize = 'lg',
  onBack,
  trailing,
  testID = 'hadith-list-header',
}: {
  title?: string;
  subtitle?: string;
  titleSize?: 'lg' | 'md';
  onBack: () => void;
  trailing?: ReactNode;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const lg = titleSize === 'lg';
  const titleStyle = lg
    ? { fontSize: LG_TITLE_SIZE, lineHeight: Math.round(LG_TITLE_SIZE * amiriNaturalLeading) }
    : { fontSize: MD_TITLE_SIZE, lineHeight: MD_TITLE_LINE_HEIGHT };

  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[2] }} testID={testID}>
      <IconButton icon={BACK} label={t('hadith.back')} mirrorInRtl onPress={onBack} testID={`${testID}-back`} variant="raised" />
      <View style={{ flex: 1, minWidth: 0 }}>
        {title !== undefined ? (
          <UiText accessibilityRole="header" style={titleStyle} testID={`${testID}-title`} variant="displaySm">
            {title}
          </UiText>
        ) : null}
        {title !== undefined && subtitle !== undefined ? (
          lg ? (
            <UiText testID={`${testID}-subtitle`} tone="muted" variant="caption">
              {subtitle}
            </UiText>
          ) : (
            <UiText testID={`${testID}-subtitle`} tone="muted" variant="label" weight={400}>
              {subtitle}
            </UiText>
          )
        ) : null}
      </View>
      {trailing ?? null}
    </View>
  );
}
