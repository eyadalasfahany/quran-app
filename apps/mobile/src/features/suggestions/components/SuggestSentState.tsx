import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/core/theme';
import { Icon, UiText } from '@/shared/ui';

const CHECK = { ios: 'checkmark', android: 'check' } as const;

// The frame's disc is 64 pt, the check 28 pt, and the body text 16 on 26.
const DISC_SIZE = 64;
const CHECK_SIZE = 28;
const BODY_SIZE = 16;
const BODY_LINE_HEIGHT = 26;

/**
 * The confirmation that replaces the form once a suggestion is sent (screens/, #SuggestSheetSent): a check
 * in a round disc, a title and a short thank-you, centred in the space the fields left.
 */
export function SuggestSentState({ testID = 'suggest-sent' }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View
      style={{ alignItems: 'center', flex: 1, gap: theme.space[3], justifyContent: 'center', paddingHorizontal: theme.space[2] }}
      testID={testID}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          alignItems: 'center',
          backgroundColor: theme.colors.fillSecondary,
          borderRadius: DISC_SIZE / 2,
          height: DISC_SIZE,
          justifyContent: 'center',
          width: DISC_SIZE,
        }}
      >
        <Icon color={theme.colors.brand} name={CHECK} size={CHECK_SIZE} testID={`${testID}-check`} />
      </View>
      <UiText accessibilityRole="header" align="center" style={{ fontSize: 22, lineHeight: 30 }} testID={`${testID}-title`} variant="displaySm">
        {t('suggest.sentTitle')}
      </UiText>
      <UiText align="center" style={{ fontSize: BODY_SIZE, lineHeight: BODY_LINE_HEIGHT }} testID={`${testID}-body`} tone="muted" variant="body">
        {t('suggest.sentBody')}
      </UiText>
    </View>
  );
}
