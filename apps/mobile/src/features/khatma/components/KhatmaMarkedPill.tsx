import { duration } from '@quran/design-tokens';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useSlideUp, useTheme } from '@/core/theme';
import { GlassSurface, UiText } from '@/shared/ui';

const VISIBLE_MS = duration.pulse * 2 + duration.slow + duration.standard;

export function KhatmaMarkedPill({
  onDone,
  testID = 'khatma-marked-pill',
}: {
  onDone: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const motion = useSlideUp();
  const label = t('khatma.marked');

  useEffect(() => {
    const timer = setTimeout(onDone, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <View accessibilityLiveRegion="polite" pointerEvents="none" testID={testID}>
      <Animated.View entering={motion.entering} exiting={motion.exiting}>
        <GlassSurface radius="pill" testID={`${testID}-surface`}>
          <View
            accessibilityLabel={label}
            accessibilityRole="text"
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: theme.size.touchTarget,
              paddingHorizontal: theme.space[4],
            }}
          >
            <UiText scale="bar" variant="subhead">
              {label}
            </UiText>
          </View>
        </GlassSurface>
      </Animated.View>
    </View>
  );
}
