import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import { useNavigation } from 'expo-router';

import { useTheme } from '@/core/theme';

import { setContentGutter } from './content-gutter-store';

export const CONTENT_COLUMN_MAX_WIDTH = 720;

// Outside a navigator (tests, a screen rendered alone) there is no navigation object: the column publishes on mount.
function useOptionalNavigation() {
  try {
    return useNavigation();
  } catch {
    return undefined;
  }
}

export function ContentColumn({ children, gutter, testID }: { children: ReactNode; gutter?: number; testID?: string }) {
  const theme = useTheme();
  const navigation = useOptionalNavigation();
  const resolvedGutter = gutter ?? theme.space[6];

  // Only the focused screen's gutter counts: the floating notices follow it (ADR 0085).
  useEffect(() => {
    const publish = () => setContentGutter(resolvedGutter);
    if (navigation?.isFocused?.() ?? true) publish();
    return navigation?.addListener?.('focus', publish);
  }, [navigation, resolvedGutter]);

  return (
    <View
      style={{
        alignSelf: 'center',
        flex: 1,
        maxWidth: CONTENT_COLUMN_MAX_WIDTH,
        paddingHorizontal: resolvedGutter,
        width: '100%',
      }}
      testID={testID}
    >
      {children}
    </View>
  );
}
