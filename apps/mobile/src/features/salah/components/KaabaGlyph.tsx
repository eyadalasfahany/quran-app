import { Path, Svg } from 'react-native-svg';

const GOLD = '#c9a961';

/**
 * KaabaGlyph component for displaying the Kaaba icon.
 * It is purely decorative and hidden from accessibility.
 */
export function KaabaGlyph({ size = 24, testID }: { size?: number; testID?: string }) {
  return (
    <Svg
      accessibilityElementsHidden
      height={size}
      importantForAccessibility="no-hide-descendants"
      testID={testID}
      viewBox="0 0 24 24"
      width={size}
    >
      {/* Top face */}
      <Path d="M12 2 L21 7 L12 12 L3 7 Z" fill="rgb(38, 38, 36)" />
      {/* Left face */}
      <Path d="M3 7 L12 12 L12 22 L3 17 Z" fill="rgb(9, 13, 11)" />
      {/* Right face */}
      <Path d="M12 12 L21 7 L21 17 L12 22 Z" fill="rgb(17, 19, 17)" />
      {/* Band left */}
      <Path d="M3 9.3 L12 14.3 L12 16.1 L3 11.1 Z" fill={GOLD} />
      {/* Band right */}
      <Path d="M12 14.3 L21 9.3 L21 11.1 L12 16.1 Z" fill={GOLD} />
      {/* Door */}
      <Path d="M17.7 14.2 L19.3 13.3 L19.3 17 L17.7 17.9 Z" fill="#e6c77e" />
    </Svg>
  );
}
