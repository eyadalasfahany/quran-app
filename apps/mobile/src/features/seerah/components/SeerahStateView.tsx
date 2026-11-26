import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { Button, Card, Icon, UiText } from '@/shared/ui';

export type SeerahStateKind = 'downloading' | 'offline' | 'error' | 'emptyYear';

const DOWNLOAD = { ios: 'arrow.down.to.line', android: 'download' } as const;

/**
 * The cards that stand in for the map's content (frames SeerahStateDownloading, …Offline, …Error, …EmptyYear): the pack is
 * downloading (progress, no button: it downloads with no tap and cannot be cancelled, ADR 0097), needs a connection, failed
 * to open, or the chosen age has no events (a button to the nearest age). The screen draws the map under it and docks the
 * card at the bottom. The action shows for `offline` and `error` when `onAction` is given and, for `emptyYear`, when a
 * `nearestAge` exists; `downloading` never draws one.
 */
export function SeerahStateView({
  kind,
  sizeLabel,
  progress = 0,
  doneLabel,
  age,
  nearestAge = null,
  onAction,
  testID = 'seerah-state-view',
}: {
  kind: SeerahStateKind;
  /** The pack's size, «٢٫٤ م.ب»; used by `downloading` and `error`. */
  sizeLabel?: string;
  /** 0..1, for `downloading`. */
  progress?: number;
  /** «١٫٤ م.ب»: how much is done, for `downloading`. */
  doneLabel?: string;
  /** The empty age, for `emptyYear`. */
  age?: number;
  nearestAge?: number | null;
  onAction?: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const size = sizeLabel ?? '';

  if (kind === 'emptyYear') {
    return (
      <Card accessibilityRole="summary" padding={3} radius="lg" testID={testID}>
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[3] }}>
          <View style={{ flex: 1, gap: 2 }}>
            <UiText variant="headline">{t('seerah.states.emptyYearTitle')}</UiText>
            <UiText tone="muted" variant="caption">
              {t('seerah.states.emptyYearBody', { age: formatNumber(age ?? 0, locale) })}
            </UiText>
          </View>
          {onAction !== undefined && nearestAge !== null ? (
            <Button
              label={t('seerah.states.emptyYearAction', { age: formatNumber(nearestAge, locale) })}
              onPress={onAction}
              size="small"
              testID={`${testID}-action`}
              variant="primary"
            />
          ) : null}
        </View>
      </Card>
    );
  }

  const copy = ({
    // No action: the download cannot be cancelled (ADR 0097).
    downloading: { action: null, body: null, title: 'seerah.states.downloadingTitle' },
    offline: { action: 'seerah.states.offlineAction', body: 'seerah.states.offlineBody', title: 'seerah.states.offlineTitle' },
    error: { action: 'seerah.states.errorAction', body: 'seerah.states.errorBody', title: 'seerah.states.errorTitle' },
  } as const)[kind];
  const meta = kind === 'downloading' ? t('seerah.states.downloadingMeta', { done: doneLabel ?? '', total: size }) : null;

  return (
    <Card padding={5} radius="xl" testID={testID}>
      <View style={{ gap: theme.space[3] }}>
        <UiText accessibilityRole="header" variant="displayMd">
          {t(copy.title)}
        </UiText>
        {copy.body === null ? null : (
          <UiText tone="muted" variant="subhead">
            {t(copy.body, { size })}
          </UiText>
        )}
        {kind === 'downloading' ? (
          <View
            accessibilityLabel={t('seerah.states.progress')}
            accessible
            accessibilityRole="progressbar"
            accessibilityValue={{ max: 100, min: 0, now: Math.round(Math.min(1, Math.max(0, progress)) * 100) }}
            style={{ backgroundColor: theme.colors.fillTrack, borderRadius: theme.radius.progress, height: theme.size.progressHeight, overflow: 'hidden' }}
            testID={`${testID}-progress`}
          >
            <View
              style={{ backgroundColor: theme.colors.brand, height: '100%', width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }}
              testID={`${testID}-progress-fill`}
            />
          </View>
        ) : null}
        {meta === null ? null : (
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[2] }}>
            <Icon color={theme.colors.inkMuted} name={DOWNLOAD} size={theme.size.iconSm} />
            <UiText style={{ flex: 1 }} tone="muted" variant="caption">
              {meta}
            </UiText>
          </View>
        )}
        {onAction === undefined || copy.action === null ? null : (
          <Button label={t(copy.action)} onPress={onAction} stretch testID={`${testID}-action`} variant="primary" />
        )}
      </View>
    </Card>
  );
}
