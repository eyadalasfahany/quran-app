import type { SvgMushafPackStatus } from '@/core/mushaf-pack';
import type { SvgMushafInstallFailure } from '@/core/mushaf-pack/types';
import { formatNumber, type Locale } from '@/core/i18n';
import { timing, useTheme } from '@/core/theme';
import { Button, GlassSurface, UiText } from '@/shared/ui';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, withTiming } from 'react-native-reanimated';

const BYTES_PER_MEGABYTE = 1_000_000;

const ERROR_KEY = {
  checksum: 'reader.mushafDownload.error.checksum',
  import: 'reader.mushafDownload.error.import',
  network: 'reader.mushafDownload.error.network',
  size: 'reader.mushafDownload.error.size',
  storage: 'reader.mushafDownload.error.storage',
  unavailable: 'reader.mushafDownload.error.unavailable',
} as const satisfies Record<SvgMushafInstallFailure, string>;

/**
 * The Mushaf download card (screens/frames/loading/LoadingMushaf.html). It replaces the page list while the pack is
 * not installed: the title, the size, the progress, the hint, «القراءة الآن» and the cancel while it downloads.
 */
export function MushafDownloadCard({
  status,
  progress,
  sizeBytes,
  mushafName,
  error,
  onDownload,
  onDownloadWithData,
  onCancel,
  onReadNow,
  testID,
}: {
  status: SvgMushafPackStatus;
  progress: number;
  sizeBytes: number | null;
  mushafName: string;
  error: SvgMushafInstallFailure | null;
  onDownload: () => void;
  onDownloadWithData?: () => void;
  onCancel: () => void;
  onReadNow: () => void;
  testID?: string;
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const locale: Locale = i18n.language === 'en' ? 'en' : 'ar';
  const reduceMotion = useReducedMotion();
  const busy = status === 'downloading' || status === 'verifying';
  const percent = Math.round(progress * 100);

  const size =
    sizeBytes === null
      ? null
      : t('reader.mushafs.size', { mb: formatNumber(Math.round(sizeBytes / BYTES_PER_MEGABYTE), locale) });
  const subtitle =
    size === null
      ? t('reader.mushafDownload.subtitleNoSize', { name: mushafName })
      : t('reader.mushafDownload.subtitle', { name: mushafName, size });

  // `timing` is a JS function: read its config here, never inside the worklet.
  const fillTiming = timing('fast');
  const fillStyle = useAnimatedStyle(() => ({
    width: reduceMotion ? `${percent}%` : withTiming(`${percent}%`, fillTiming),
  }));

  return (
    <GlassSurface
      radius="card"
      style={{ alignSelf: 'stretch', gap: theme.space[3], paddingHorizontal: theme.space[5], paddingVertical: theme.space[6] }}
      testID={testID}
    >
      <View style={{ alignItems: 'center', gap: theme.space[3] }}>
        <UiText align="center" variant="displaySm">
          {t('reader.mushafDownload.title')}
        </UiText>
        <UiText align="center" tone="muted" variant="subhead">
          {subtitle}
        </UiText>
        {busy ? (
          <View style={{ alignSelf: 'stretch', flexDirection: 'row', gap: theme.space[3] }}>
            <View
              accessible
              accessibilityLabel={t('reader.mushafDownload.progressLabel')}
              accessibilityRole="progressbar"
              accessibilityValue={{ max: 100, min: 0, now: percent }}
              style={{
                backgroundColor: theme.colors.line,
                borderRadius: theme.radius.progress,
                flex: 1,
                height: theme.space[2],
                overflow: 'hidden',
              }}
              testID={testID ? `${testID}-progress` : undefined}
            >
              <Animated.View
                style={[{ backgroundColor: theme.colors.brand, bottom: 0, position: 'absolute', start: 0, top: 0 }, fillStyle]}
              />
            </View>
            <UiText tone="ink" variant="caption" weight={600}>
              {`${formatNumber(percent, locale)}٪`}
            </UiText>
          </View>
        ) : null}
        {status === 'waiting_wifi' ? (
          <UiText align="center" tone="muted" variant="caption">
            {t('reader.mushafDownload.waitingWifi')}
          </UiText>
        ) : null}
        {status === 'failed' && error !== null ? (
          <UiText align="center" tone="danger" variant="caption">
            {t(ERROR_KEY[error])}
          </UiText>
        ) : null}
        {busy ? (
          <UiText align="center" tone="muted" variant="caption">
            {t('reader.mushafDownload.readWhileDownloading')}
          </UiText>
        ) : null}
      </View>
      <Button
        label={t('reader.mushafDownload.readNow')}
        onPress={onReadNow}
        size="regular"
        stretch
        testID={testID ? `${testID}-read-now` : undefined}
        variant="primary"
      />
      {busy ? (
        <Button label={t('reader.mushafDownload.cancel')} onPress={onCancel} stretch variant="ghost" />
      ) : null}
      {status === 'waiting_wifi' && onDownloadWithData !== undefined ? (
        <Button label={t('reader.mushafDownload.downloadWithData')} onPress={onDownloadWithData} stretch variant="ghost" />
      ) : null}
      {status === 'absent' || status === 'cancelled' || status === 'failed' ? (
        <Button
          label={t(status === 'failed' ? 'reader.mushafDownload.retry' : 'reader.mushafDownload.download')}
          onPress={onDownload}
          stretch
          variant="ghost"
        />
      ) : null}
    </GlassSurface>
  );
}
