import { type ReactNode, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatPlaybackClock, prayerClock } from '@/core/i18n/clock';
import { getLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { UiText, useContrastColors } from '@/shared/ui';

import type { WidgetPreviewVariant } from '../data/widget-add-catalog';
import { readWidgetSnapshot } from '../snapshot/store';
import { prayerStateAt } from '../snapshot/select';
import type { PrayerKey, WidgetLabels } from '../snapshot/types';

/** Aspect ratio of a small home-screen widget preview in the add confirm card. */
const PREVIEW_ASPECT = 1;

/**
 * In-app mock of a widget face for the add confirm dialog (ADR 0054). Uses theme tokens and snapshot labels only — no
 * Quran or dhikr text.
 */
export function WidgetPreviewMock({
  variant,
  testID = 'widget-preview-mock',
}: {
  variant: WidgetPreviewVariant;
  testID?: string;
}) {
  const { t } = useTranslation();
  const snapshot = readWidgetSnapshot();

  if (variant === 'nextPrayerSmall' || variant === 'nextPrayerWide') {
    return (
      <NextPrayerPreview snapshot={snapshot} testID={testID} wide={variant === 'nextPrayerWide'} />
    );
  }

  if (variant === 'progressMedium') {
    const percent = snapshot?.progress.percent ?? 0;
    return (
      <PreviewCard testID={testID}>
        <UiText tone="muted" variant="caption" weight={600}>
          {snapshot?.labels.progressTitle ?? t('widgetsHelp.items.progress.title')}
        </UiText>
        <UiText variant="title" weight={700}>
          {percent}%
        </UiText>
      </PreviewCard>
    );
  }

  if (variant === 'continueReading') {
    const reading = snapshot?.reading;
    return (
      <PreviewCard raised={false} testID={testID}>
        <UiText tone="muted" variant="caption" weight={600}>
          {snapshot?.labels.continueReading ?? t('widgetsHelp.items.continueReading.title')}
        </UiText>
        <UiText variant="body" weight={600}>
          {reading === null || reading === undefined
            ? snapshot?.labels.openApp ?? '…'
            : `${reading.surah} · ${reading.ayah}`}
        </UiText>
      </PreviewCard>
    );
  }

  if (variant === 'misbaha') {
    const count = snapshot?.misbaha.count ?? 0;
    return (
      <PreviewCard testID={testID}>
        <UiText tone="muted" variant="caption" weight={600}>
          {snapshot?.labels.misbaha ?? t('widgetsHelp.items.misbaha.title')}
        </UiText>
        <UiText variant="title" weight={700}>
          {count}
        </UiText>
      </PreviewCard>
    );
  }

  return (
    <PreviewCard testID={testID}>
      <UiText tone="muted" variant="caption" weight={600}>
        {snapshot?.labels.azkarTitle ?? t('widgetsHelp.items.azkar.title')}
      </UiText>
      <UiText tone="muted" variant="body">
        {snapshot?.labels.azkarEmpty ?? '…'}
      </UiText>
    </PreviewCard>
  );
}

function PreviewCard({
  centered = false,
  children,
  raised = true,
  testID,
}: {
  centered?: boolean;
  children: ReactNode;
  raised?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();

  return (
    <View
      style={{
        alignItems: centered ? 'center' : undefined,
        aspectRatio: PREVIEW_ASPECT,
        backgroundColor: raised ? theme.colors.surfaceRaised : theme.colors.brandSurface,
        borderColor: colors.line,
        borderRadius: theme.radius.lg,
        borderWidth: raised ? theme.stroke.hairline : 0,
        gap: theme.space[2],
        justifyContent: centered ? 'flex-start' : 'center',
        padding: theme.space[4],
        width: '100%',
      }}
      testID={testID}
    >
      {children}
    </View>
  );
}

function NextPrayerPreview({
  snapshot,
  wide,
  testID,
}: {
  snapshot: ReturnType<typeof readWidgetSnapshot>;
  wide: boolean;
  testID: string;
}) {
  const theme = useTheme();
  const locale = snapshot?.locale ?? getLocale();
  const [nowMs] = useState(() => Date.now());
  const prayer = snapshot?.prayer ?? { entries: [], place: null, validUntil: null };
  const state = prayerStateAt(prayer, nowMs);
  const labels = snapshot?.labels;

  return (
    <PreviewCard centered testID={testID}>
      <UiText align="center" tone="muted" variant="caption" weight={600}>
        {labels?.nextPrayer ?? '…'}
      </UiText>
      {state.kind === 'next' ? (
        <>
          <UiText align="center" variant="title" weight={700}>
            {labels === undefined ? state.key : prayerLabel(labels, state.key)}
          </UiText>
          <UiText align="center" tone="muted" variant="body">
            {prayerClock(new Date(state.at), locale)}
          </UiText>
          <View style={{ flex: 1, minHeight: theme.space[1] }} />
          <UiText align="center" tone="muted" variant="caption">
            {labels?.remaining ?? '…'}
          </UiText>
          <UiText align="center" style={{ color: theme.colors.brand }} variant="title" weight={700}>
            {formatPlaybackClock(state.at - nowMs, locale)}
          </UiText>
          {wide && prayer.place !== null ? (
            <UiText align="center" tone="muted" variant="caption">
              {prayer.place}
            </UiText>
          ) : null}
        </>
      ) : (
        <UiText align="center" variant="body" weight={600}>
          {state.kind === 'noLocation' ? labels?.noLocation : labels?.stale}
        </UiText>
      )}
    </PreviewCard>
  );
}

function prayerLabel(labels: WidgetLabels, key: PrayerKey): string {
  switch (key) {
    case 'fajr':
      return labels.prayerFajr;
    case 'dhuhr':
      return labels.prayerDhuhr;
    case 'asr':
      return labels.prayerAsr;
    case 'maghrib':
      return labels.prayerMaghrib;
    case 'isha':
      return labels.prayerIsha;
    default:
      return key;
  }
}
