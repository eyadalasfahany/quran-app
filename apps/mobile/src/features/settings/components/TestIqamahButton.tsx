import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { sendTestIqamahNotification } from '@/features/salah/data/test-iqamah';
import type { NextPrayerName } from '@/features/salah/data/prayer-times';
import { ReminderPermissionDialog } from '@/features/reminders/components/ReminderPermissionDialog';
import { Button, UiText } from '@/shared/ui';

type SentResult = {
  prayer: NextPrayerName;
  paired: boolean;
  delaySeconds: number;
  offsetMinutes: number;
};

/**
 * «إرسال إشعار إقامة تجريبي»: fires iqamah (and optionally paired adhan) through production content and channels, a few
 * seconds out. Refused permission opens the shared reminder permission dialog.
 */
export function TestIqamahButton({ testID = 'iqamah-test' }: { testID?: string }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();
  const [result, setResult] = useState<SentResult | null>(null);
  const [denied, setDenied] = useState(false);

  const send = () => {
    void sendTestIqamahNotification().then((outcome) => {
      if (!outcome.sent) {
        setDenied(true);
        setResult(null);
        return;
      }
      setResult({
        prayer: outcome.prayer,
        paired: outcome.paired,
        delaySeconds: outcome.delaySeconds,
        offsetMinutes: outcome.offsetMinutes,
      });
    });
  };

  const prayerName = result === null ? '' : t(`home.salah.${result.prayer}`);

  return (
    <View style={{ gap: theme.space[2] }}>
      <Button
        label={t('salah.iqamahOffset.testAction')}
        onPress={send}
        stretch
        testID={testID}
        variant="secondary"
      />
      {result !== null ? (
        <UiText testID={`${testID}-result`} tone="muted" variant="caption">
          {result.paired
            ? t('salah.iqamahOffset.testSentPaired', {
                name: prayerName,
                iqamahSeconds: formatNumber(result.delaySeconds, locale),
                adhanSeconds: formatNumber(result.delaySeconds + result.offsetMinutes, locale),
              })
            : t('salah.iqamahOffset.testSent', {
                name: prayerName,
                seconds: formatNumber(result.delaySeconds, locale),
              })}
        </UiText>
      ) : null}
      <ReminderPermissionDialog onClose={() => setDenied(false)} visible={denied} />
    </View>
  );
}
