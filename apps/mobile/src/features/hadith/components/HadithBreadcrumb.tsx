import { View } from 'react-native';

import { UiText } from '@/shared/ui';

/** The reader's two-line place: the collection over the book. One header with a combined label. */
export function HadithBreadcrumb({
  collectionTitle,
  bookTitle,
  testID = 'hadith-breadcrumb',
}: {
  collectionTitle: string;
  bookTitle: string;
  testID?: string;
}) {
  return (
    <View
      accessibilityLabel={`${collectionTitle}, ${bookTitle}`}
      accessibilityRole="header"
      accessible
      style={{ flex: 1, gap: 2, minWidth: 0 }}
      testID={testID}
    >
      <UiText numberOfLines={1} testID={`${testID}-collection`} variant="caption" weight={600}>
        {collectionTitle}
      </UiText>
      <UiText numberOfLines={1} testID={`${testID}-book`} tone="muted" variant="label" weight={400}>
        {bookTitle}
      </UiText>
    </View>
  );
}
