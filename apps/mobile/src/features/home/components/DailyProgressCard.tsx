import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { UiText, useContrastColors } from '@/shared/ui';

import type { DailyProgressLine } from '../hooks/useDailyProgress';

import { DailyProgressEmpty } from './DailyProgressEmpty';
import { DailyProgressRing } from './DailyProgressRing';
import { DailyProgressRow } from './DailyProgressRow';

// The card pads 18 pt (quran-app-screens.html, #Main «تقدّم اليوم»).
const CARD_PADDING = 18;

/**
 * Home's «تقدّم اليوم» card (quran-app-screens.html, #Main, ADR 0034 §5): one ring for today's total and a row per goal
 * the user chose. «تعديل» opens the goals sheet. With nothing chosen it shows the prompt instead.
 */
export function DailyProgressCard({
  percent,
  lines,
  onOpenGoals,
  testID = 'home-daily-progress',
}: {
  percent: number;
  lines: readonly DailyProgressLine[];
  onOpenGoals: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const colors = useContrastColors();
  const hasGoals = lines.length > 0;

  return (
    <View
      style={{
        backgroundColor: theme.colors.surfaceRaised,
        borderColor: colors.line,
        borderRadius: theme.radius.hero,
        borderWidth: theme.stroke.hairline,
        gap: theme.space[3],
        padding: CARD_PADDING,
      }}
      testID={testID}
    >
      <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
        <UiText accessibilityRole="header" variant="headline">
          {t('home.dailyProgress.title')}
        </UiText>
        {hasGoals ? (
          <Pressable
            accessibilityLabel={t('home.dailyProgress.edit')}
            accessibilityRole="button"
            onPress={onOpenGoals}
            style={{ justifyContent: 'center', minHeight: theme.size.touchTarget, minWidth: theme.size.touchTarget }}
            testID={`${testID}-edit`}
          >
            <UiText tone="brand" variant="subhead" weight={600}>
              {t('home.dailyProgress.edit')}
            </UiText>
          </Pressable>
        ) : null}
      </View>
      {hasGoals ? (
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[4] }}>
          <DailyProgressRing label={t('home.dailyProgress.percent', { percent: formatNumber(percent, locale) })} percent={percent} />
          <View style={{ flex: 1, minWidth: 0 }}>
            {lines.map((line) => (
              <DailyProgressRow done={line.done} key={line.key} label={line.label} testID={`${testID}-${line.key}`} value={line.value} />
            ))}
          </View>
        </View>
      ) : (
        <DailyProgressEmpty onSetGoals={onOpenGoals} testID={`${testID}-empty`} />
      )}
    </View>
  );
}
