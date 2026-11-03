import { memo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText } from '@/shared/ui';

import type { PrayerTimesOutput } from '../data/prayer-times';

import { PrayerRowIcon } from './PrayerRowIcon';

/**
 * Times-card row (ADR 0057 redesign): leading prayer glyph, name (+ «قادمة» when active),
 * time, and reminder bell. No sky photos. Past / sunrise use muted ink.
 */
function PrayerTimeRowView({
  prayerKey,
  name,
  time,
  active = false,
  muted = false,
  past = false,
  bell,
  last = false,
  testID,
}: {
  prayerKey: keyof PrayerTimesOutput;
  name: string;
  /** Formatted time («٥:١٠»). */
  time: string;
  /** The prayer the hero counts down to. */
  active?: boolean;
  /** الشروق — marker, not a صلاة. */
  muted?: boolean;
  /** Past today (and not active): muted ink. */
  past?: boolean;
  /** PrayerBell; الشروق passes nothing. */
  bell?: ReactNode;
  last?: boolean;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const inkMuted = muted || past;
  const nameColor = active ? 'brand' : inkMuted ? 'muted' : 'ink';

  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: active ? theme.colors.fillSecondary : 'transparent',
        borderBottomColor: theme.colors.line,
        borderBottomWidth: last ? 0 : theme.stroke.hairline,
        flexDirection: 'row',
        gap: theme.space[3],
        minHeight: 60,
        overflow: 'hidden',
        paddingEnd: theme.space[2],
        paddingStart: theme.space[4],
        paddingVertical: theme.space[2],
      }}
      testID={testID}
    >
      {active ? (
        <View
          style={{ backgroundColor: theme.colors.brand, bottom: 0, position: 'absolute', start: 0, top: 0, width: 3 }}
          testID={testID ? `${testID}-active-bar` : undefined}
        />
      ) : null}
      <PrayerRowIcon
        active={active}
        muted={inkMuted}
        prayerKey={prayerKey}
        testID={testID ? `${testID}-icon` : undefined}
      />
      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <UiText numberOfLines={1} tone={nameColor} variant="body" weight={active ? 600 : 400}>
          {name}
        </UiText>
        {active ? (
          <UiText testID={testID ? `${testID}-badge` : undefined} tone="brand" variant="caption" weight={500}>
            {t('salah.upcoming')}
          </UiText>
        ) : null}
      </View>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[1] }}>
        <UiText tone={nameColor} variant="headline" weight={active ? 700 : 600}>
          {time}
        </UiText>
        {bell ?? (
          <View
            accessible={false}
            importantForAccessibility="no"
            style={{ height: theme.size.touchTarget, width: theme.size.touchTarget }}
            testID={testID ? `${testID}-bell-slot` : undefined}
          />
        )}
      </View>
    </View>
  );
}

export const PrayerTimeRow = memo(PrayerTimeRowView);
