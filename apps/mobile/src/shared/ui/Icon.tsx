import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import { I18nManager, View, type ColorValue } from 'react-native';

export type IconName = { ios: SFSymbol; android: AndroidSymbol };

// Decorative: the control around an icon carries the label.
export function Icon({
  name,
  color,
  size = 22,
  mirrorInRtl = false,
  testID,
}: {
  name: IconName;
  color: ColorValue;
  size?: number;
  mirrorInRtl?: boolean;
  testID?: string;
}) {
  const box = { height: size, width: size };
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[box, mirrorInRtl && I18nManager.isRTL ? { transform: [{ scaleX: -1 }] } : null]}
      testID={testID}
    >
      <SymbolView fallback={<View style={box} />} name={name} size={size} tintColor={color} />
    </View>
  );
}
