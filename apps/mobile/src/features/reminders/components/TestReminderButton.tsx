import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Button, UiText } from '@/shared/ui';

import { sendTestReminder } from '../data/test-reminder';
import { ReminderPermissionDialog } from './ReminderPermissionDialog';

type Outcome = 'sent' | 'sentLate' | null;

/**
 * «إرسال تذكير تجريبي»: fires a notification through the same channel and trigger path as the real reminders, 5 seconds out.
 * In development only, a second button fires one two minutes out, to check a background delivery on a device. Refused
 * permission opens the device-settings notice.
 */
export function TestReminderButton({ testID = 'reminders-test' }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [denied, setDenied] = useState(false);

  const send = (delaySeconds?: number) => {
    void sendTestReminder(delaySeconds).then((sent) => {
      if (!sent) {
        setDenied(true);
        return;
      }
      setOutcome(delaySeconds === undefined ? 'sent' : 'sentLate');
    });
  };

  return (
    <View style={{ gap: theme.space[2] }}>
      <Button label={t('reminders.test.action')} onPress={() => send()} stretch testID={testID} variant="secondary" />
      {__DEV__ ? (
        <Button
          label={t('reminders.test.devAction')}
          onPress={() => send(120)}
          stretch
          testID={`${testID}-dev`}
          variant="secondary"
        />
      ) : null}
      {outcome !== null ? (
        <UiText testID={`${testID}-result`} tone="muted" variant="caption">
          {outcome === 'sent' ? t('reminders.test.sent') : t('reminders.test.devSent')}
        </UiText>
      ) : null}
      <ReminderPermissionDialog onClose={() => setDenied(false)} visible={denied} />
    </View>
  );
}
