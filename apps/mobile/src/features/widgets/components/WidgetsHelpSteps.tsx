import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

const STEP_KEYS = ['step1', 'step2', 'step3'] as const;

/** Numbered platform steps (Android or iOS section bodies). */
export function WidgetsHelpSteps({
  namespace,
  testID,
}: {
  namespace: 'widgetsHelp.android' | 'widgetsHelp.androidLock' | 'widgetsHelp.ios';
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={{ gap: theme.space[2], paddingHorizontal: theme.space[4], paddingVertical: theme.space[3] }} testID={testID}>
      {STEP_KEYS.map((key, index) => (
        <UiText key={key} tone="muted" variant="subhead">
          {`${index + 1}. ${t(`${namespace}.${key}`)}`}
        </UiText>
      ))}
    </View>
  );
}
