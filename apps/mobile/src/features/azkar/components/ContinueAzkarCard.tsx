import { amiriNaturalLeading, typeScale } from '@quran/design-tokens';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { Rosette, UiText } from '@/shared/ui';

const TRACK_HEIGHT = 4;
const TRACK_OPACITY = 0.2;
// The rosette overhangs the card's top trailing corner, as in the Continue reading card.
const ROSETTE = { offset: -40, size: 180 } as const;

export type ContinueAzkarResume = { title: string; completed: number; total: number };

/**
 * Azkar home's «تابع» card (screens/, #AzkarHome): the scope in progress, on the brand surface, with its
 * count and bar. Renders nothing when there is nothing to continue.
 */
export function ContinueAzkarCard({
  resume,
  onPress,
  testID = 'azkar-continue-card',
}: {
  resume: ContinueAzkarResume | null;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();

  if (resume === null) {
    return null;
  }

  const fraction = resume.total === 0 ? 0 : Math.min(resume.completed / resume.total, 1);
  const percent = Math.round(fraction * 100);
  const progressText = t('azkar.reader.progress', {
    current: formatNumber(resume.completed, locale),
    total: formatNumber(resume.total, locale),
  });
  const track = { borderRadius: TRACK_HEIGHT / 2, height: TRACK_HEIGHT };

  return (
    <Pressable
      accessibilityLabel={t('common.a11yTriple', {
        label: t('azkar.browse.continueEyebrow'),
        title: resume.title,
        detail: progressText,
      })}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: theme.colors.brandSurface,
        borderRadius: theme.radius.hero,
        gap: theme.size.stackGap,
        opacity: pressed ? theme.opacity.pressed : 1,
        overflow: 'hidden',
        padding: theme.size.cardPadding,
      })}
      testID={testID}
    >
      <Rosette
        color={theme.colors.goldOnBrandSurface}
        drawKey="azkar-continue"
        size={ROSETTE.size}
        style={{ end: ROSETTE.offset, opacity: theme.opacity.ornament, position: 'absolute', top: ROSETTE.offset }}
        testID={`${testID}-rosette`}
      />
      <UiText tone="onBrandMuted" variant="caption" weight={500}>
        {t('azkar.browse.continueEyebrow')}
      </UiText>
      <UiText
        style={{ lineHeight: Math.round(typeScale.displayLg.size * amiriNaturalLeading) }}
        tone="onBrandSurface"
        variant="displayLg"
      >
        {resume.title}
      </UiText>
      <UiText tone="onBrandMuted" variant="subhead">
        {progressText}
      </UiText>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[3], marginTop: theme.space[3] }}>
        <View style={[track, { flex: 1, overflow: 'hidden' }]}>
          <View style={[track, { backgroundColor: theme.colors.onBrandSurface, opacity: TRACK_OPACITY }, StyleSheet.absoluteFill]} />
          <View style={[track, { backgroundColor: theme.colors.gold, width: `${percent}%` }]} testID={`${testID}-progress`} />
        </View>
        <UiText tone="onBrandSurface" variant="caption" weight={600}>
          {t('azkar.browse.resume')}
        </UiText>
      </View>
    </Pressable>
  );
}
