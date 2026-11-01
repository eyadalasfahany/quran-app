import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Button, UiText, useContrastColors } from '@/shared/ui';

const GRABBER_HEIGHT = 5;
const GRABBER_WIDTH = 36;
// The sheet starts 96 pt down, under the Home header (quran-app-screens.html, «أهدافي اليومية»).
const SHEET_TOP = 96;
const SCRIM_OPACITY = 0.4;

/**
 * The daily goals sheet (quran-app-screens.html, #DailyGoalsSheet): a card that rises from the bottom over a dimmed
 * screen, with the title, «تم» to close, a note that the choice stays on this device, the goals, and a save button.
 * Each change is saved as it is made, so save and done both close the sheet.
 */
export function DailyGoalsSheet({
  title,
  note,
  children,
  onClose,
  testID = 'daily-goals-sheet',
}: {
  title: string;
  note: string;
  children: ReactNode;
  onClose: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();

  return (
    <View style={{ bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 }} testID={testID}>
      <Pressable
        accessibilityLabel={t('sibha.close')}
        accessibilityRole="button"
        onPress={onClose}
        style={{ backgroundColor: theme.colors.ink, bottom: 0, left: 0, opacity: SCRIM_OPACITY, position: 'absolute', right: 0, top: 0 }}
        testID={`${testID}-scrim`}
      />
      <View
        accessibilityLabel={title}
        accessibilityRole="none"
        accessibilityViewIsModal
        style={{
          backgroundColor: theme.colors.surfaceRaised,
          borderTopEndRadius: theme.radius.xl,
          borderTopStartRadius: theme.radius.xl,
          bottom: 0,
          gap: theme.space[3],
          left: 0,
          paddingBottom: theme.space[6],
          paddingHorizontal: theme.space[5],
          paddingTop: theme.space[2],
          position: 'absolute',
          right: 0,
          top: SHEET_TOP,
        }}
      >
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            alignSelf: 'center',
            backgroundColor: colors.line,
            borderRadius: GRABBER_HEIGHT / 2,
            height: GRABBER_HEIGHT,
            width: GRABBER_WIDTH,
          }}
        />
        <View style={{ alignItems: 'center', flexDirection: 'row', minHeight: theme.size.touchTarget }}>
          <UiText accessibilityRole="header" style={{ flex: 1 }} variant="headline">
            {title}
          </UiText>
          <Pressable
            accessibilityLabel={t('common.done')}
            accessibilityRole="button"
            onPress={onClose}
            style={{ alignItems: 'center', justifyContent: 'center', minHeight: theme.size.touchTarget, minWidth: theme.size.touchTarget }}
            testID={`${testID}-done`}
          >
            <UiText tone="brand" variant="headline">
              {t('common.done')}
            </UiText>
          </Pressable>
        </View>
        <UiText style={{ marginHorizontal: theme.space[2] }} tone="muted" variant="caption">
          {note}
        </UiText>
        {children}
        <Button label={t('dailyGoals.save')} onPress={onClose} stretch testID={`${testID}-save`} variant="primary" />
      </View>
    </View>
  );
}
