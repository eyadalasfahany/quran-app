import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

// Frame HadithCollSavedUnverified: the body is 13 over 20.
const BODY_LINE_HEIGHT = 20;

/** The banner under the Saved header that explains why some saved items show at book level. */
export function UnverifiedNotice({ testID = 'unverified-notice' }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const title = t('hadith.saved.noticeTitle');
  const body = t('hadith.saved.noticeBody');

  return (
    <View
      accessible
      accessibilityLabel={`${title}, ${body}`}
      accessibilityRole="summary"
      style={{
        backgroundColor: theme.colors.fillSecondary,
        borderRadius: theme.radius.tile,
        gap: 4,
        paddingHorizontal: 14,
        paddingVertical: 12,
      }}
      testID={testID}
    >
      <UiText testID={`${testID}-title`} variant="subhead" weight={600}>
        {title}
      </UiText>
      <UiText style={{ lineHeight: BODY_LINE_HEIGHT }} testID={`${testID}-body`} tone="muted" variant="caption">
        {body}
      </UiText>
    </View>
  );
}
