import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { megabytes } from '@/core/format/megabytes';
import { formatNumber } from '@/core/i18n/numbers';
import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { UiText, useContrastColors } from '@/shared/ui';

const STOP_RECT_SIZE = 14;

type Props = {
  name: string;
  surahCount: number;
  bytes: number;
  isDownloading: boolean;
  downloadProgress: number;
  onDownloadAll: () => void;
  onStop: () => void;
  showDivider?: boolean;
  testID?: string;
};

export function ReciterStorageRow({
  name,
  surahCount,
  bytes,
  isDownloading,
  downloadProgress,
  onDownloadAll,
  onStop,
  showDivider = false,
  testID,
}: Props) {
  const { t } = useTranslation();
  const locale = useLocale();
  const theme = useTheme();
  const colors = useContrastColors();
  const percent = Math.round(Math.min(1, Math.max(0, downloadProgress)) * 100);
  const barRadius = theme.radius.progress;
  const barHeight = theme.size.progressHeight;

  const subtitle = isDownloading
    ? t('downloads.screen.downloading')
    : `${t('downloads.screen.reciterSurahCount', { count: surahCount })} · ${t('downloads.megabytes', { value: formatNumber(megabytes(bytes), locale) })}`;

  return (
    <View
      style={[
        {
          alignItems: 'center',
          flexDirection: 'row',
          gap: theme.space[3],
          minHeight: theme.size.reciterStorageRowMinHeight,
          paddingHorizontal: theme.size.downloadRowInset,
        },
        showDivider ? { borderBottomColor: colors.line, borderBottomWidth: theme.stroke.hairline } : null,
      ]}
      testID={testID}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <UiText variant="headline">{name}</UiText>
        <UiText tone="muted" variant="label" weight={400}>
          {subtitle}
        </UiText>
        {isDownloading ? (
          <View
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: percent }}
            accessible
            style={{
              backgroundColor: theme.colors.fillSecondary,
              borderRadius: barRadius,
              height: barHeight,
              marginTop: theme.size.progressGap,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                backgroundColor: theme.colors.brand,
                borderRadius: barRadius,
                height: barHeight,
                width: `${percent}%`,
              }}
            />
          </View>
        ) : null}
      </View>
      {isDownloading ? (
        <Pressable
          accessibilityLabel={t('downloads.screen.stopA11y', { name })}
          accessibilityRole="button"
          onPress={onStop}
          style={({ pressed }) => ({
            alignItems: 'center',
            backgroundColor: theme.colors.surfaceRaised,
            borderColor: colors.line,
            borderRadius: theme.size.touchTarget / 2,
            borderWidth: theme.stroke.hairline,
            height: theme.size.touchTarget,
            justifyContent: 'center',
            opacity: pressed ? theme.opacity.pressed : 1,
            width: theme.size.touchTarget,
          })}
          testID={testID ? `${testID}-stop` : undefined}
        >
          <View
            style={{
              backgroundColor: colors.ink,
              borderRadius: theme.radius.glyph,
              height: STOP_RECT_SIZE,
              width: STOP_RECT_SIZE,
            }}
          />
        </Pressable>
      ) : (
        <Pressable
          accessibilityLabel={t('downloads.screen.downloadAllA11y', { name })}
          accessibilityRole="button"
          onPress={onDownloadAll}
          style={({ pressed }) => ({
            alignItems: 'center',
            backgroundColor: theme.colors.surfaceRaised,
            borderColor: colors.line,
            borderRadius: theme.radius.pill,
            borderWidth: theme.stroke.hairline,
            justifyContent: 'center',
            minHeight: theme.size.touchTarget,
            opacity: pressed ? theme.opacity.pressed : 1,
            paddingHorizontal: theme.space[3],
          })}
          testID={testID ? `${testID}-download-all` : undefined}
        >
          <UiText tone="brand" variant="caption" weight={600}>
            {t('downloads.screen.downloadAll')}
          </UiText>
        </Pressable>
      )}
    </View>
  );
}
