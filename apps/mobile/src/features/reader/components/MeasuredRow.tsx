import type { ReactNode } from 'react';
import { View } from 'react-native';

// Reports each list row's laid-out height so FlashList can restore the scroll position exactly.
export function MeasuredRow({
  rowKey,
  onHeight,
  children,
  testID,
}: {
  rowKey: string;
  onHeight: (rowKey: string, height: number) => void;
  children: ReactNode;
  testID?: string;
}) {
  return (
    <View
      onLayout={(event) => {
        onHeight(rowKey, event.nativeEvent.layout.height);
      }}
      testID={testID}
    >
      {children}
    </View>
  );
}
