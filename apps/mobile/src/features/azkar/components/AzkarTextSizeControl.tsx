import { View } from 'react-native';

import { FontScaleStepper } from '@/features/reader/settings/components/FontScaleStepper';
import { useTheme } from '@/core/theme';

/** The Azkar text size: the reader's own stepper (80–160%), which scales the `dhikr` token. */
export function AzkarTextSizeControl({
  value,
  onChange,
  testID = 'azkar-text-size',
}: {
  value: number;
  onChange: (fontScale: number) => void;
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <View style={{ alignItems: 'center', paddingHorizontal: theme.space[4] }} testID={testID}>
      <FontScaleStepper onChange={onChange} testID={`${testID}-stepper`} value={value} />
    </View>
  );
}
