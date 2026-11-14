import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useTheme } from '@/core/theme';
import { useSlideUp } from '@/core/theme/motion';

export type SeerahSheetDetent = 'medium' | 'large';

const HEIGHT: Record<SeerahSheetDetent, `${number}%`> = { large: '88%', medium: '58%' };

/**
 * A bottom sheet in a transparent modal (ADR 0013): a scrim that closes it, and the content docked at the bottom. `card`
 * draws the surface and the grabber; pass `false` when the content is its own card (SpotSheet). The detent is its height.
 * It slides up, or fades with Reduce Motion (`useSlideUp`). Used for the map key, a crowded spot and, on a medium window,
 * the event page.
 */
export function SeerahSheet({
  visible,
  onClose,
  detent = 'medium',
  card = true,
  children,
  testID = 'seerah-sheet',
}: {
  visible: boolean;
  onClose: () => void;
  detent?: SeerahSheetDetent;
  card?: boolean;
  children: ReactNode;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const slide = useSlideUp();

  if (!visible) {
    return null;
  }

  return (
    <Modal animationType="none" onRequestClose={onClose} transparent visible>
      <View style={{ flex: 1, justifyContent: 'flex-end' }} testID={testID}>
        <Pressable
          accessibilityLabel={t('seerah.close')}
          accessibilityRole="button"
          onPress={onClose}
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.scrim }]}
          testID={`${testID}-scrim`}
        />
        <Animated.View
          entering={slide.entering}
          exiting={slide.exiting}
          style={
            card
              ? {
                  backgroundColor: theme.colors.surface,
                  borderTopLeftRadius: theme.radius.xl,
                  borderTopRightRadius: theme.radius.xl,
                  height: HEIGHT[detent],
                  overflow: 'hidden',
                }
              : { maxHeight: HEIGHT[detent] }
          }
        >
          {card ? (
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={{
                alignSelf: 'center',
                backgroundColor: theme.colors.lineStrong,
                borderRadius: theme.size.grabberRadius,
                height: theme.size.grabberHeight,
                marginTop: theme.space[2],
                width: theme.size.grabberWidth,
              }}
              testID={`${testID}-grabber`}
            />
          ) : null}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}
