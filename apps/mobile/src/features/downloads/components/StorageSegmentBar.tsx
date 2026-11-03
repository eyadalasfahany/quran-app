import { View } from 'react-native';

import { useTheme } from '@/core/theme';

type Props = {
  audioBytes: number;
  fontBytes: number;
  tafsirBytes: number;
  testID?: string;
};

const SEGMENT_GAP = 2;

export function StorageSegmentBar({ audioBytes, fontBytes, tafsirBytes, testID }: Props) {
  const theme = useTheme();
  const total = audioBytes + fontBytes + tafsirBytes;

  const trackStyle = {
    backgroundColor: theme.colors.fillSecondary,
    borderRadius: theme.size.storageBarRadius,
    height: theme.size.storageBarHeight,
    overflow: 'hidden' as const,
  };

  if (total === 0) {
    return (
      <View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={trackStyle}
        testID={testID}
      />
    );
  }

  const segments = [
    { bytes: audioBytes, color: theme.colors.brand },
    { bytes: fontBytes, color: theme.colors.gold },
    { bytes: tafsirBytes, color: theme.colors.chartBlue },
  ];

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[trackStyle, { flexDirection: 'row', gap: SEGMENT_GAP }]}
      testID={testID}
    >
      {segments.map((segment, index) => (
        <View
          key={index}
          style={{
            backgroundColor: segment.color,
            height: theme.size.storageBarHeight,
            width: `${(segment.bytes / total) * 100}%`,
          }}
        />
      ))}
    </View>
  );
}
