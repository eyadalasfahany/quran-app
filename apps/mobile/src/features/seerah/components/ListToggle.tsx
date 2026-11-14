import { useTranslation } from 'react-i18next';

import { IconButton } from '@/shared/ui';

const LIST_ICON = { ios: 'list.bullet', android: 'format_list_bulleted' } as const;
const MAP_ICON = { ios: 'map', android: 'map' } as const;

export type SeerahView = 'map' | 'list';

/**
 * The header button that swaps the map for the list (the screen-reader alternative, «عرض كقائمة») and back. It shows what
 * a tap switches to: on the map it is the list glyph with the label «عرض كقائمة», on the list the map glyph. 44 pt.
 */
export function ListToggle({ view, onToggle, testID = 'seerah-list-toggle' }: { view: SeerahView; onToggle: () => void; testID?: string }) {
  const { t } = useTranslation();

  return (
    <IconButton
      icon={view === 'map' ? LIST_ICON : MAP_ICON}
      label={view === 'map' ? t('seerah.map.toList') : t('seerah.map.toMap')}
      onPress={onToggle}
      testID={testID}
      variant="raised"
    />
  );
}
