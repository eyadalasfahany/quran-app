import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useSlideUp, useTheme } from '@/core/theme';

import { useSheetHeight } from '../form-sheet';

/**
 * Pins the card to the bottom of a transparent modal over a scrim. The screen
 * behind is not a form sheet, so iOS does not scale or push it.
 */
export function SheetHost({ children, topGap }: { children: ReactNode; topGap: number }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const height = useSheetHeight(topGap);
  const slideUp = useSlideUp();

  return (
    <View style={{ backgroundColor: theme.colors.scrim, flex: 1 }} testID="sheet-scrim">
      <Pressable
        accessibilityLabel={t('reader.sheet.close')}
        accessibilityRole="button"
        onPress={() => router.back()}
        style={{ flex: 1 }}
        testID="sheet-backdrop"
      />
      <Animated.View entering={slideUp.entering} style={{ height }} testID="sheet-host">
        {children}
      </Animated.View>
    </View>
  );
}
