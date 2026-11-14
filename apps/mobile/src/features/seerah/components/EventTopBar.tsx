import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { IconButton, UiText } from '@/shared/ui';

import { ListToggle } from './ListToggle';

const BACK_ICON = { ios: 'chevron.left', android: 'chevron_left' } as const;

/**
 * The top row of the event page (frame SeerahEvent): back to the map, a quiet crumb («المدينة · الغزوات») and the list
 * toggle. The crumb is data (the place and the kind of event), so the screen passes it.
 */
export function EventTopBar({
  crumb,
  onBack,
  onShowList,
  testID = 'seerah-event-topbar',
}: {
  crumb: string;
  onBack: () => void;
  onShowList: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[2] }} testID={testID}>
      <IconButton icon={BACK_ICON} label={t('seerah.event.back')} mirrorInRtl onPress={onBack} testID={`${testID}-back`} variant="raised" />
      <UiText align="center" numberOfLines={1} style={{ flex: 1 }} tone="muted" variant="caption">
        {crumb}
      </UiText>
      <ListToggle onToggle={onShowList} testID={`${testID}-list`} view="map" />
    </View>
  );
}
