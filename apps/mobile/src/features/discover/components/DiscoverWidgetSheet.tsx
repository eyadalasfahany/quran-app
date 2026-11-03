import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useTheme } from '@/core/theme';
import { useSlideUp } from '@/core/theme/motion';
import { WidgetAddTrigger } from '@/features/widgets/components/WidgetAddTrigger';
import { Button, Card, UiText, useContrastColors } from '@/shared/ui';

type WidgetStepKey =
  | 'widgetsHelp.ios.step1'
  | 'widgetsHelp.ios.step2'
  | 'widgetsHelp.ios.step3'
  | 'widgetsHelp.android.step1'
  | 'widgetsHelp.android.step2';

// Steps and copy reuse the Settings widgets help (`widgetsHelp`), so the two never drift apart.
// The third Android step points at the pin button on that page, so it is not repeated here.
const IOS_STEPS: readonly WidgetStepKey[] = ['widgetsHelp.ios.step1', 'widgetsHelp.ios.step2', 'widgetsHelp.ios.step3'];
const ANDROID_STEPS: readonly WidgetStepKey[] = ['widgetsHelp.android.step1', 'widgetsHelp.android.step2'];

/**
 * The «أضف الودجت» sheet (ADR 0053, DiscoverWidgetSheet). «تم» reads it: `onRead` ticks the row. Tapping the scrim
 * or pressing back closes it without ticking.
 */
export function DiscoverWidgetSheet({
  visible,
  onRead,
  onClose,
}: {
  visible: boolean;
  onRead: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const motion = useSlideUp();

  return (
    <Modal animationType="none" onRequestClose={onClose} transparent visible={visible}>
      <View accessibilityViewIsModal style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          accessibilityLabel={t('discover.close')}
          accessibilityRole="button"
          onPress={onClose}
          style={{ backgroundColor: colors.scrim, bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 }}
          testID="discover-widget-scrim"
        />
        <Animated.View
          entering={motion.entering}
          exiting={motion.exiting}
          style={{
            backgroundColor: theme.colors.surfaceRaised,
            borderTopLeftRadius: theme.radius.xl,
            borderTopRightRadius: theme.radius.xl,
            maxHeight: '85%',
            paddingBottom: theme.space[8],
            paddingHorizontal: theme.space[5],
            paddingTop: theme.space[3],
          }}
        >
          <ScrollView contentContainerStyle={{ gap: theme.space[4] }}>
            <View style={{ alignSelf: 'center', backgroundColor: colors.lineStrong, borderRadius: 3, height: 5, width: 36 }} />
            <UiText accessibilityRole="header" variant="displayMd">
              {t('discover.widget.title')}
            </UiText>
            <UiText tone="muted" variant="body">
              {t('widgetsHelp.intro')}
            </UiText>
            <StepGroup steps={IOS_STEPS} title={t('widgetsHelp.sections.ios')} />
            <StepGroup steps={ANDROID_STEPS} title={t('widgetsHelp.sections.android')} />
            <WidgetAddTrigger catalogId="nextPrayer" testID="discover-widget-add" />
            <Button label={t('discover.widget.action')} onPress={onRead} stretch testID="discover-widget-read" variant="primary" />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function StepGroup({ title, steps }: { title: string; steps: readonly WidgetStepKey[] }) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View style={{ gap: theme.space[2] }}>
      <UiText tone="muted" variant="caption" weight={600}>
        {title}
      </UiText>
      <Card padding={4} radius="lg" style={{ gap: theme.space[2] }}>
        {steps.map((step) => (
          <UiText key={step} variant="body">
            {t(step)}
          </UiText>
        ))}
      </Card>
    </View>
  );
}
