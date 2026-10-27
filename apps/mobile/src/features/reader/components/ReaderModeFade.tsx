import { useEffect, type ReactNode } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { timing } from '@/core/theme';

export function ReaderModeFade({ mode, children }: { mode: string; children: ReactNode }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = 0;
    opacity.value = withTiming(1, timing('standard'));
  }, [mode, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[{ flex: 1 }, style]} testID="reader-mode-fade">
      {children}
    </Animated.View>
  );
}
