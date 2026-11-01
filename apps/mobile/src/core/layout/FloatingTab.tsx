import type { GestureResponderEvent } from 'react-native';

import { FloatingTabBarItem } from '@/shared/ui/FloatingTabBarItem';
import type { IconName } from '@/shared/ui/Icon';

// A headless TabTrigger hands its child the trigger's state through asChild: `isFocused` and `onPress`. This
// adapter maps them onto a FloatingTabBarItem, so the item stays a plain control with a `selected` prop.
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
  return (
    <FloatingTabBarItem icon={icon} label={label} onPress={onPress} selected={isFocused ?? false} testID={testID} />
  );
}
