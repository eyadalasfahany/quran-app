import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon, UiText, useContrastColors, type IconName } from '@/shared/ui';

import { DiscoverNewBadge } from './DiscoverNewBadge';
import { DiscoverTick } from './DiscoverTick';

const CHEVRON: IconName = { ios: 'chevron.right', android: 'chevron_right' };

/**
 * One checklist row: the tick, the title, the «جديد» badge when new, and the chevron. Pressing it opens the feature.
 * The accessibility label carries the state, since the tick is decorative.
 */
export function DiscoverRow({
  title,
  done,
  isNew,
  onPress,
  testID,
}: {
  title: string;
  done: boolean;
  isNew: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const state = done ? t('discover.a11y.done') : t('discover.a11y.notDone');
  const label = isNew ? `${title}, ${state}, ${t('discover.a11y.new')}` : `${title}, ${state}`;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ checked: done }}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        flexDirection: 'row',
        gap: theme.space[3],
        minHeight: theme.size.touchTarget,
        opacity: pressed ? theme.opacity.pressed : 1,
        paddingHorizontal: theme.space[4],
        paddingVertical: theme.space[2],
      })}
      testID={testID}
    >
      <DiscoverTick done={done} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <UiText variant="body" weight={600}>
          {title}
        </UiText>
      </View>
      {isNew ? <DiscoverNewBadge /> : null}
      <Icon color={colors.inkMuted} mirrorInRtl name={CHEVRON} size={16} />
    </Pressable>
  );
}
