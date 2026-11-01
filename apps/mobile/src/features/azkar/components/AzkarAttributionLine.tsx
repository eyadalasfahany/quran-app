import { useTranslation } from 'react-i18next';
import { Linking, Pressable, View } from 'react-native';

import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

import { azkarAttribution } from '../audio/attribution';
import type { AzkarRecording } from '../data/model';

/**
 * The attribution and licence of a recording (ADR 0031 §8). The attribution follows the reader's locale with the
 * fallback in `azkarAttribution`. A licence with a URL opens it.
 */
export function AzkarAttributionLine({ recording, testID = 'azkar-attribution' }: { recording: AzkarRecording; testID?: string }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();
  const attribution = azkarAttribution(recording, locale);
  const licenceLabel = t('azkar.audio.licence', { licence: attribution.licence });
  const licenceUrl = attribution.licenceUrl;

  return (
    <View style={{ alignItems: 'center', gap: theme.space[1] }} testID={testID}>
      {attribution.text !== null ? (
        <UiText align="center" testID={`${testID}-text`} tone="muted" variant="caption">
          {attribution.text}
        </UiText>
      ) : null}
      {licenceUrl !== null ? (
        <Pressable
          accessibilityLabel={licenceLabel}
          accessibilityRole="link"
          onPress={() => {
            void Linking.openURL(licenceUrl);
          }}
          style={{ alignItems: 'center', justifyContent: 'center', minHeight: theme.size.touchTarget }}
          testID={`${testID}-link`}
        >
          <UiText tone="brand" variant="caption" weight={600}>
            {licenceLabel}
          </UiText>
        </Pressable>
      ) : (
        <UiText align="center" tone="muted" variant="caption">
          {licenceLabel}
        </UiText>
      )}
    </View>
  );
}
