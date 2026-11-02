import { Platform, type GestureResponderEvent } from 'react-native';

import { FloatingTabBarItem } from '@/shared/ui/FloatingTabBarItem';
import type { IconName } from '@/shared/ui/Icon';

import { tabSelectionHaptic } from './tab-selection-haptic';

// A headless TabTrigger hands its child the trigger's state through asChild: `isFocused` and `onPress`. This
// adapter maps them onto a FloatingTabBarItem, so the item stays a plain control with a `selected` prop.
// On iOS this item is only ever the rail (phones keep the native tabs), so the selection tick plays there (tab-selection-haptic).
export function FloatingTab({
  icon,
  label,
  testID,
  isFocused,
  onPress,
}: {
  icon: IconName;
  label: string;
  testID: string;
  isFocused?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
}) {
  const focused = isFocused ?? false;
  const press = (event: GestureResponderEvent) => {
    tabSelectionHaptic(Platform.OS, focused);
    onPress?.(event);
  };
  return <FloatingTabBarItem icon={icon} label={label} onPress={press} selected={focused} testID={testID} />;
}
