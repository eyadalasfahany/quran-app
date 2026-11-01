import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { formatNumber } from '@/core/i18n/numbers';
import { useLocale } from '@/core/i18n/useLocale';
import { useTheme } from '@/core/theme';
import { Button, Icon, IconButton, type IconName, UiText, useContrastColors } from '@/shared/ui';

import { megabytes, percentOf, type AzkarDownloadEntry } from '../audio/downloads';

const DONE_ICON = { ios: 'checkmark', android: 'check' } as const satisfies IconName;
const DOWNLOADING_ICON = { ios: 'arrow.down', android: 'arrow_downward' } as const satisfies IconName;
const FAILED_ICON = { ios: 'exclamationmark.triangle', android: 'warning' } as const satisfies IconName;
const CANCEL_ICON = { ios: 'xmark', android: 'close' } as const satisfies IconName;
const REMOVE_ICON = { ios: 'trash', android: 'delete' } as const satisfies IconName;

/**
 * One downloaded, downloading or failed recording on the downloads screen (frame AzkarDownloads). Its action follows
 * the state: cancel while downloading, remove when done, retry when failed. Every action names its recording.
 */
export function AzkarDownloadRow({
  entry,
  onCancel,
  onRemove,
  onRetry,
  showDivider = false,
  testID = 'azkar-download-row',
}: {
  entry: AzkarDownloadEntry;
  onCancel: (recordingKey: string) => void;
  onRemove: (recordingKey: string) => void;
  onRetry: (entry: AzkarDownloadEntry) => void;
  showDivider?: boolean;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const locale = useLocale();
  const percent = percentOf(entry.progress);
  const size = entry.bytes === null ? null : t('azkar.downloads.megabytes', { value: formatNumber(megabytes(entry.bytes), locale) });

  const subtitle = (() => {
    if (entry.state === 'done') {
      return size === null ? t('azkar.download.done') : t('azkar.download.rowDone', { size });
    }
    if (entry.state === 'downloading') {
      return t('azkar.download.progress', { percent: formatNumber(percent, locale) });
    }
    if (entry.state === 'failed') {
      return t('azkar.download.failed');
    }
    return null;
  })();

  const leadingIcon = entry.state === 'done' ? DONE_ICON : entry.state === 'failed' ? FAILED_ICON : DOWNLOADING_ICON;
  const leadingStyle =
    entry.state === 'done'
      ? { backgroundColor: theme.colors.brand }
      : entry.state === 'failed'
        ? { backgroundColor: theme.colors.fillSecondary }
        : { borderColor: colors.line, borderWidth: theme.stroke.hairline };
  const leadingTone = entry.state === 'done' ? theme.colors.surface : entry.state === 'failed' ? theme.colors.danger : colors.inkMuted;

  return (
    <View
      style={[
        {
          alignItems: 'center',
          flexDirection: 'row',
          gap: theme.space[3],
          minHeight: theme.size.downloadRowMinHeight,
          paddingHorizontal: theme.size.downloadRowInset,
          paddingVertical: theme.space[3],
        },
        showDivider ? { borderBottomColor: colors.line, borderBottomWidth: theme.stroke.hairline } : null,
      ]}
      testID={testID}
    >
      <View
        style={[
          {
            alignItems: 'center',
            borderRadius: theme.radius.pill,
            flexShrink: 0,
            height: theme.space[8] + theme.space[1],
            justifyContent: 'center',
            width: theme.space[8] + theme.space[1],
          },
          leadingStyle,
        ]}
      >
        <Icon color={leadingTone} name={leadingIcon} size={theme.size.iconSm} />
      </View>
      <View style={{ flex: 1, gap: theme.space[1], minWidth: 0 }}>
        <UiText variant="headline">{entry.title}</UiText>
        {entry.state === 'downloading' ? (
          <View
            accessible
            accessibilityLabel={entry.title}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: percent }}
            style={{
              backgroundColor: colors.fillSecondary,
              borderRadius: theme.radius.progress,
              flexDirection: 'row',
              height: theme.size.progressHeight,
              marginVertical: theme.size.progressGap,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                backgroundColor: theme.colors.brand,
                borderRadius: theme.radius.progress,
                height: theme.size.progressHeight,
                width: `${percent}%`,
              }}
            />
          </View>
        ) : null}
        {subtitle === null ? null : (
          <UiText tone={entry.state === 'failed' ? 'danger' : 'muted'} variant="caption">
            {subtitle}
          </UiText>
        )}
      </View>
      {entry.state === 'downloading' ? (
        <IconButton
          icon={CANCEL_ICON}
          label={`${t('azkar.download.cancel')} ${entry.title}`}
          onPress={() => onCancel(entry.recordingKey)}
          testID={`${testID}-cancel`}
          tone="muted"
          variant="raised"
        />
      ) : null}
      {entry.state === 'done' ? (
        <IconButton
          icon={REMOVE_ICON}
          label={`${t('azkar.download.remove')} ${entry.title}`}
          onPress={() => onRemove(entry.recordingKey)}
          testID={`${testID}-remove`}
          tone="muted"
          variant="raised"
        />
      ) : null}
      {entry.state === 'failed' ? (
        <Button
          label={t('azkar.download.retry')}
          onPress={() => onRetry(entry)}
          size="small"
          testID={`${testID}-retry`}
          variant="ghost"
        />
      ) : null}
    </View>
  );
}
