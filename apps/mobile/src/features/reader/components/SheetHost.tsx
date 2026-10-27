import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useSheetHeight } from '../form-sheet';

/**
 * Pins the card to the bottom of a transparent modal. The screen behind is not
 * a form sheet, so iOS does not scale or push it.
 */
export function SheetHost({ children, topGap }: { children: ReactNode; topGap: number }) {
  const { t } = useTranslation();
  const height = useSheetHeight(topGap);

  return (
    <View style={{ flex: 1 }}>
      <Pressable
        accessibilityLabel={t('reader.sheet.close')}
        accessibilityRole="button"
        onPress={() => router.back()}
        style={{ flex: 1 }}
        testID="sheet-backdrop"
      />
      <View style={{ height }} testID="sheet-host">
        {children}
      </View>
    </View>
  );
}
