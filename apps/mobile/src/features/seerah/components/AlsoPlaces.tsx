import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { UiText, arabicTextDirection } from '@/shared/ui';

/**
 * «أماكن مذكورة أيضًا»: the other places the book names in the event's text. They are shown, not pinned; a tap shows the
 * place on the map. Renders nothing when there are none. Names are the book's Arabic.
 */
export function AlsoPlaces({
  places,
  onPress,
  testID = 'seerah-also-places',
}: {
  places: readonly { id: string; name: string }[];
  onPress: (placeId: string) => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  if (places.length === 0) {
    return null;
  }

  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[1] }} testID={testID}>
      <UiText tone="muted" variant="caption">
        {t('seerah.event.alsoPlaces')}
      </UiText>
      {places.map((place, index) => (
        <View key={place.id} style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[1] }}>
          {index > 0 ? (
            <UiText tone="muted" variant="caption">
              {'·'}
            </UiText>
          ) : null}
          <Pressable
            accessibilityLabel={t('seerah.event.placeChipLabel', { name: place.name })}
            accessibilityRole="button"
            onPress={() => onPress(place.id)}
            style={{ justifyContent: 'center', minHeight: theme.size.touchTarget, paddingHorizontal: theme.space[1] }}
            testID={`${testID}-${place.id}`}
          >
            <UiText style={arabicTextDirection} tone="brand" variant="caption" weight={600}>
              {place.name}
            </UiText>
          </Pressable>
        </View>
      ))}
    </View>
  );
}
