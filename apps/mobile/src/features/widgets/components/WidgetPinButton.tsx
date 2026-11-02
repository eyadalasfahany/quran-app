import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { requestPinWidget } from 'react-native-android-widget';

import type { WidgetProviderName } from '../android/names';
import { Button } from '@/shared/ui';

/**
 * Android-only «إضافة إلى الشاشة الرئيسية» (react-native-android-widget 0.26.0 `requestPinWidget`).
 * Hidden on iOS and when pinning is not supported.
 */
export function WidgetPinButton({
  widgetName,
  testID,
}: {
  widgetName: WidgetProviderName;
  testID?: string;
}) {
  const { t } = useTranslation();
  const [pinSupported, setPinSupported] = useState(true);

  const onPress = useCallback(async () => {
    if (Platform.OS !== 'android') {
      return;
    }
    try {
      const ok = await requestPinWidget({ widgetName });
      if (!ok) {
        setPinSupported(false);
      }
    } catch {
      // Native module missing (stale/Expo Go binary). Hide pin; manual steps above still work.
      setPinSupported(false);
    }
  }, [widgetName]);

  if (Platform.OS !== 'android' || !pinSupported) {
    return null;
  }

  return (
    <Button
      accessibilityHint={t('widgetsHelp.android.pinA11y', { widget: widgetName })}
      label={t('widgetsHelp.android.pinAction')}
      onPress={() => void onPress()}
      size="small"
      testID={testID}
      variant="primary"
    />
  );
}
