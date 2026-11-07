import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { SheetFrame } from '@/features/reader/components/SheetFrame';
import { SheetScrollView } from '@/features/reader/components/SheetScrollView';
import { useTheme } from '@/core/theme';
import { Button, UiText } from '@/shared/ui';

/**
 * The content of the daily goals sheet (screens/, #DailyGoalsSheet). It sits in a SheetHost, which
 * supplies the card's slide, scrim and drag. This component draws the frame, the title with «تم», the note, the
 * goals and the save button. Each change is saved as it is made, so save and done both close the sheet.
 */
export function DailyGoalsSheet({
  title,
  note,
  children,
  onClose,
  testID = 'daily-goals',
}: {
  title: string;
  note: string;
  children: ReactNode;
  onClose: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <SheetFrame testID={`${testID}-frame`}>
      <View style={{ flex: 1, gap: theme.space[3], paddingHorizontal: theme.space[4] }}>
        <View style={{ alignItems: 'center', flexDirection: 'row', minHeight: theme.size.touchTarget }} testID={testID}>
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
        <SheetScrollView>
          <View style={{ gap: theme.space[4], paddingBottom: theme.space[8] }}>
            <UiText style={{ marginHorizontal: theme.space[2] }} tone="muted" variant="caption">
              {note}
            </UiText>
            {children}
            <Button label={t('dailyGoals.save')} onPress={onClose} stretch testID={`${testID}-save`} variant="primary" />
          </View>
        </SheetScrollView>
      </View>
    </SheetFrame>
  );
}
