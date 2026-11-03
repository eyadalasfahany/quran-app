import { type ReactNode, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatPlaybackClock, prayerClock } from '@/core/i18n/clock';
import { formatPercent } from '@/core/i18n/numbers';
import { getLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { UiText, displayText, useContrastColors } from '@/shared/ui';

import type { WidgetPreviewVariant } from '../data/widget-add-catalog';
import { readWidgetSnapshot } from '../snapshot/store';
import { prayerStateAt } from '../snapshot/select';
import type { PrayerKey, WidgetLabels } from '../snapshot/types';

/** Aspect ratio of a small home-screen widget preview in the add confirm card. */
const PREVIEW_ASPECT = 1;

const PRAYER_DOT_ORDER: readonly PrayerKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

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
    return <ProgressPreview snapshot={snapshot} testID={testID} t={t} />;
  }

  if (variant === 'continueReading') {
    return <ContinueReadingPreview snapshot={snapshot} testID={testID} t={t} />;
  }

  if (variant === 'misbaha') {
    return <MisbahaPreview snapshot={snapshot} testID={testID} t={t} />;
  }

  return <AzkarPreview snapshot={snapshot} testID={testID} t={t} />;
}

function PreviewCard({
  brand = false,
  children,
  spaceBetween = false,
  testID,
}: {
  brand?: boolean;
  children: ReactNode;
  spaceBetween?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = useContrastColors();

  return (
    <View
      style={{
        aspectRatio: PREVIEW_ASPECT,
        backgroundColor: brand ? theme.colors.brandSurface : theme.colors.surfaceRaised,
        borderColor: colors.line,
        borderRadius: theme.radius.lg,
        borderWidth: brand ? 0 : theme.stroke.hairline,
        justifyContent: spaceBetween ? 'space-between' : 'flex-start',
        padding: theme.space[4],
        width: '100%',
      }}
      testID={testID}
    >
      {children}
    </View>
  );
}

function Chip({ children, onBrand = false }: { children: ReactNode; onBrand?: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: onBrand ? 'transparent' : theme.colors.fillSecondary,
        borderColor: onBrand ? theme.colors.onBrandSurfaceMuted : undefined,
        borderWidth: onBrand ? theme.stroke.hairline : 0,
        borderRadius: theme.radius.pill,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}
    >
      {children}
    </View>
  );
}

function Band({
  caption,
  children,
  onBrand = false,
}: {
  caption: string;
  children: ReactNode;
  onBrand?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        alignSelf: 'stretch',
        backgroundColor: onBrand ? theme.colors.brandSurface : theme.colors.fillSecondary,
        borderRadius: theme.radius.tile,
        gap: theme.space[1],
        paddingHorizontal: theme.space[3],
        paddingVertical: 10,
      }}
    >
      <UiText
        style={{ color: onBrand ? theme.colors.onBrandSurfaceMuted : theme.colors.inkMuted }}
        variant="caption"
      >
        {caption}
      </UiText>
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

  if (state.kind !== 'next' || labels === undefined) {
    return (
      <PreviewCard testID={testID}>
        <UiText tone="muted" variant="caption" weight={600}>
          {labels?.nextPrayer ?? '…'}
        </UiText>
        <UiText variant="body" weight={600}>
          {state.kind === 'noLocation' ? labels?.noLocation : labels?.stale}
        </UiText>
      </PreviewCard>
    );
  }

  const name = prayerLabel(labels, state.key);
  const time = prayerClock(new Date(state.at), locale);
  const remaining = formatPlaybackClock(state.at - nowMs, locale);

  if (wide) {
    return (
      <PreviewCard spaceBetween testID={testID}>
        <View style={{ alignSelf: 'stretch', gap: theme.space[1] }}>
          <UiText tone="muted" variant="caption" weight={600}>
            {labels.nextPrayer}
          </UiText>
          <UiText style={displayText('displaySm')} variant="title">
            {name}
          </UiText>
          <Chip>
            <UiText variant="body" weight={600}>
              {time}
            </UiText>
          </Chip>
        </View>
        <PrayerPreviewDots nextKey={state.key} nowMs={nowMs} prayer={prayer} />
        <Band caption={labels.remaining} onBrand>
          <UiText style={{ color: theme.colors.onBrandSurface }} variant="title" weight={700}>
            {remaining}
          </UiText>
        </Band>
      </PreviewCard>
    );
  }

  return (
    <PreviewCard spaceBetween testID={testID}>
      <View style={{ alignSelf: 'stretch', gap: theme.space[1] }}>
        <UiText tone="muted" variant="caption" weight={600}>
          {labels.nextPrayer}
        </UiText>
        <UiText style={displayText('displaySm')} variant="title">
          {name}
        </UiText>
        <Chip>
          <UiText variant="body" weight={600}>
            {time}
          </UiText>
        </Chip>
      </View>
      <PrayerPreviewDots nextKey={state.key} nowMs={nowMs} prayer={prayer} />
      <Band caption={labels.remaining} onBrand>
        <UiText style={{ color: theme.colors.onBrandSurface }} variant="title" weight={700}>
          {remaining}
        </UiText>
      </Band>
    </PreviewCard>
  );
}

function ProgressPreview({
  snapshot,
  testID,
  t,
}: {
  snapshot: ReturnType<typeof readWidgetSnapshot>;
  testID: string;
  t: (key: string) => string;
}) {
  const theme = useTheme();
  const locale = snapshot?.locale ?? getLocale();
  const progress = snapshot?.progress ?? { percent: 0, rows: [] };
  const labels = snapshot?.labels;
  const title = labels?.progressTitle ?? t('widgetsHelp.items.progress.title');
  const summary =
    progress.rows.length === 0
      ? labels?.progressEmpty ?? '…'
      : `${progress.rows.filter((row) => row.done).length} ${labels?.of ?? 'of'} ${progress.rows.length}`;

  return (
    <PreviewCard spaceBetween testID={testID}>
      <View style={{ flexDirection: 'row', gap: theme.space[3] }}>
        <View
          style={{
            alignItems: 'center',
            borderColor: theme.colors.fillSecondary,
            borderRadius: 46,
            borderWidth: 9,
            height: 92,
            justifyContent: 'center',
            width: 92,
          }}
        >
          <UiText variant="title" weight={700}>
            {formatPercent(progress.percent, locale)}
          </UiText>
        </View>
        <View style={{ flex: 1, gap: theme.space[1], justifyContent: 'center' }}>
          <UiText tone="muted" variant="caption" weight={600}>
            {title}
          </UiText>
          {progress.rows.slice(0, 2).map((row) => (
            <UiText key={row.key} variant="caption" weight={600}>
              {row.done ? '✓ ' : '○ '}
              {row.label}
            </UiText>
          ))}
        </View>
      </View>
      <Band caption={title}>
        <UiText variant="body" weight={700}>
          {summary}
        </UiText>
      </Band>
    </PreviewCard>
  );
}

function ContinueReadingPreview({
  snapshot,
  testID,
  t,
}: {
  snapshot: ReturnType<typeof readWidgetSnapshot>;
  testID: string;
  t: (key: string) => string;
}) {
  const theme = useTheme();
  const labels = snapshot?.labels;
  const reading = snapshot?.reading;

  if (reading === null || reading === undefined) {
    return (
      <PreviewCard brand testID={testID}>
        <UiText style={{ color: theme.colors.onBrandSurfaceMuted }} variant="caption" weight={600}>
          {labels?.continueReading ?? t('widgetsHelp.items.continueReading.title')}
        </UiText>
        <UiText style={{ color: theme.colors.onBrandSurface }} variant="body" weight={600}>
          {labels?.openApp ?? '…'}
        </UiText>
      </PreviewCard>
    );
  }

  const place = `${labels?.ayahLabel ?? '…'} ${reading.ayah} · ${labels?.pageLabel ?? '…'} ${reading.page}`;

  return (
    <PreviewCard brand spaceBetween testID={testID}>
      <View style={{ gap: theme.space[1] }}>
        <UiText style={{ color: theme.colors.onBrandSurfaceMuted }} variant="caption" weight={600}>
          {labels?.continueReading}
        </UiText>
        <UiText style={[displayText('displaySm'), { color: theme.colors.onBrandSurface }]} variant="title">
          {reading.surah}
        </UiText>
        <Chip onBrand>
          <UiText style={{ color: theme.colors.onBrandSurfaceMuted }} variant="caption" weight={600}>
            {place}
          </UiText>
        </Chip>
      </View>
      <UiText
        style={{
          alignSelf: 'flex-start',
          backgroundColor: theme.colors.onBrandSurface,
          borderRadius: theme.radius.pill,
          color: theme.colors.brandSurface,
          overflow: 'hidden',
          paddingHorizontal: 14,
          paddingVertical: 8,
        }}
        variant="caption"
        weight={700}
      >
        {labels?.resume}
      </UiText>
    </PreviewCard>
  );
}

function MisbahaPreview({
  snapshot,
  testID,
  t,
}: {
  snapshot: ReturnType<typeof readWidgetSnapshot>;
  testID: string;
  t: (key: string) => string;
}) {
  const theme = useTheme();
  const misbaha = snapshot?.misbaha ?? { count: 0, target: null, todayTotal: 0 };
  const labels = snapshot?.labels;
  const targetText =
    misbaha.target === null
      ? labels?.misbahaNoTarget ?? '…'
      : `${labels?.of ?? 'of'} ${misbaha.target}`;

  return (
    <PreviewCard spaceBetween testID={testID}>
      <UiText tone="muted" variant="caption" weight={600}>
        {labels?.misbaha ?? t('widgetsHelp.items.misbaha.title')}
      </UiText>
      <UiText style={displayText('displaySm')} variant="title">
        {misbaha.count}
      </UiText>
      <View style={{ alignSelf: 'stretch', gap: theme.space[2] }}>
        <Band caption={labels?.misbaha ?? '…'}>
          <UiText variant="body" weight={700}>
            {targetText}
          </UiText>
        </Band>
        <View
          style={{
            alignSelf: 'flex-end',
            backgroundColor: theme.colors.brand,
            borderRadius: 18,
            height: 36,
            width: 36,
          }}
          testID="misbaha-preview-plus"
        />
      </View>
    </PreviewCard>
  );
}

function AzkarPreview({
  snapshot,
  testID,
  t,
}: {
  snapshot: ReturnType<typeof readWidgetSnapshot>;
  testID: string;
  t: (key: string) => string;
}) {
  const theme = useTheme();
  const azkar = snapshot?.azkar;
  const labels = snapshot?.labels;

  if (azkar === null || azkar === undefined) {
    return (
      <PreviewCard testID={testID}>
        <UiText tone="muted" variant="caption" weight={600}>
          {labels?.azkarTitle ?? t('widgetsHelp.items.azkar.title')}
        </UiText>
        <UiText tone="muted" variant="body">
          {labels?.azkarEmpty ?? '…'}
        </UiText>
      </PreviewCard>
    );
  }

  const done = azkar.sessions.filter((session) => session.complete).length;

  return (
    <PreviewCard spaceBetween testID={testID}>
      <View style={{ gap: theme.space[2] }}>
        <UiText tone="muted" variant="caption" weight={600}>
          {labels?.azkarTitle}
        </UiText>
        <Chip>
          <UiText variant="caption" weight={700}>
            {done} {labels?.of} {azkar.sessions.length}
          </UiText>
        </Chip>
      </View>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {azkar.sessions.slice(0, 5).map((session) => (
          <View
            key={session.id}
            style={{
              alignItems: 'center',
              backgroundColor: session.complete ? theme.colors.fillSecondary : theme.colors.surfaceRaised,
              borderRadius: theme.radius.sm,
              flex: 1,
              gap: 4,
              paddingVertical: 4,
            }}
          >
            <View
              style={{
                borderColor: theme.colors.fillSecondary,
                borderRadius: 22,
                borderWidth: 4,
                height: 44,
                width: 44,
              }}
            />
            <UiText numberOfLines={1} variant="caption" weight={600}>
              {session.title.slice(0, 6)}
            </UiText>
          </View>
        ))}
      </View>
    </PreviewCard>
  );
}

function PrayerPreviewDots({
  nextKey,
  nowMs,
  prayer,
}: {
  nextKey: PrayerKey;
  nowMs: number;
  prayer: { entries: { at: number; key: PrayerKey }[] };
}) {
  const theme = useTheme();
  const today = new Date(nowMs).toDateString();
  const byKey = new Map(
    prayer.entries.filter((entry) => new Date(entry.at).toDateString() === today).map((entry) => [entry.key, entry.at]),
  );
  const dotSize = 8;

  return (
    <View accessibilityRole="none" style={{ flexDirection: 'row', gap: 6 }} testID="prayer-preview-dots">
      {PRAYER_DOT_ORDER.map((key) => {
        const entryAt = byKey.get(key);
        const isNext = key === nextKey;
        const isPast = entryAt !== undefined && entryAt < nowMs;
        const filled = isNext || isPast;
        return (
          <View
            key={key}
            style={{
              backgroundColor: filled ? theme.colors.brand : 'transparent',
              borderColor: theme.colors.line,
              borderRadius: dotSize / 2,
              borderWidth: filled ? 0 : theme.stroke.hairline,
              height: dotSize,
              opacity: isPast ? 0.35 : 1,
              width: dotSize,
            }}
          />
        );
      })}
    </View>
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
