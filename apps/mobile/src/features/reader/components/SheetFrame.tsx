import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';

import { SHEET_MARGIN, SHEET_RADIUS } from '../form-sheet';

/**
 * The phone frames draw every reader sheet as a card: 8pt from the sides and
 * the bottom, 36pt corners, the page still visible above it.
 */
export function SheetFrame({ children, testID }: { children: ReactNode; testID?: string }) {
  const theme = useTheme();

  return (
    <View
      style={{
        backgroundColor: 'transparent',
        flex: 1,
        paddingBottom: SHEET_MARGIN,
        paddingHorizontal: SHEET_MARGIN,
      }}
      testID={testID}
    >
      <View
        style={{
          backgroundColor: theme.colors.surfaceRaised,
          borderRadius: SHEET_RADIUS,
          flex: 1,
          overflow: 'hidden',
        }}
        testID={testID === undefined ? undefined : `${testID}-card`}
      >
        <View style={{ alignItems: 'center', paddingTop: theme.space[2] }}>
          <View
            style={{
              backgroundColor: theme.colors.inkMuted,
              borderRadius: theme.radius.pill,
              height: 5,
              opacity: 0.4,
              width: 36,
            }}
            testID={testID === undefined ? undefined : `${testID}-grabber`}
          />
        </View>
        {children}
      </View>
    </View>
  );
}
