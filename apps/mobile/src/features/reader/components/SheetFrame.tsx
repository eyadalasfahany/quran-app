import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { useContrastColors } from '@/shared/ui';

import { FULL_SHEET_RADIUS, SHEET_MARGIN, SHEET_RADIUS, type SheetShape } from '../form-sheet';

/**
 * The phone frames draw the ayah and settings sheets as a card: 8pt from the
 * sides and the bottom, 36pt corners. Tafsir is a full-width sheet with
 * rounded top corners only.
 */
export function SheetFrame({
  children,
  shape = 'card',
  testID,
}: {
  children: ReactNode;
  shape?: SheetShape;
  testID?: string;
}) {
  const card = shape === 'card';
  const theme = useTheme();
  const colors = useContrastColors();

  return (
    <View
      style={{
        backgroundColor: 'transparent',
        flex: 1,
        paddingBottom: card ? SHEET_MARGIN : 0,
        paddingHorizontal: card ? SHEET_MARGIN : 0,
      }}
      testID={testID}
    >
      <View
        style={{
          backgroundColor: theme.colors.surfaceRaised,
          ...(card
            ? { borderRadius: SHEET_RADIUS }
            : { borderTopLeftRadius: FULL_SHEET_RADIUS, borderTopRightRadius: FULL_SHEET_RADIUS }),
          flex: 1,
          overflow: 'hidden',
        }}
        testID={testID === undefined ? undefined : `${testID}-card`}
      >
        <View style={{ alignItems: 'center', paddingTop: theme.space[2] }}>
          <View
            style={{
              backgroundColor: colors.inkMuted,
              borderRadius: theme.radius.pill,
              height: theme.size.grabberHeight,
              opacity: theme.opacity.grabber,
              width: theme.size.grabberWidth,
            }}
            testID={testID === undefined ? undefined : `${testID}-grabber`}
          />
        </View>
        {children}
      </View>
    </View>
  );
}
