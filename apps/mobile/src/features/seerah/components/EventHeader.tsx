import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText, arabicTextDirection } from '@/shared/ui';

import { AgeChip } from './AgeChip';
import { PlaceChip } from './PlaceChip';

/**
 * The head of an event page (frame SeerahEvent): the book's heading as the title, in Amiri and exactly as stored, then the
 * age chip and the place chip. The title is never edited or shortened.
 */
export function EventHeader({
  title,
  age,
  placeName,
  placeIsOther = false,
  onAgePress,
  onPlacePress,
  testID = 'seerah-event-header',
}: {
  title: string;
  age: number | null;
  placeName: string;
  placeIsOther?: boolean;
  onAgePress: () => void;
  onPlacePress: () => void;
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.space[3] - 2 }} testID={testID}>
      <UiText
        accessibilityRole="header"
        style={[arabicTextDirection, { fontSize: 30, lineHeight: 40 }]}
        variant="displayLg"
      >
        {title}
      </UiText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] }}>
        <AgeChip age={age} onPress={onAgePress} testID={`${testID}-age`} />
        <PlaceChip name={placeName} onPress={onPlacePress} other={placeIsOther} testID={`${testID}-place`} />
      </View>
    </View>
  );
}
