import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { arabicTextDirection, displayText, IconButton, NumberMedallion, UiText, useContrastColors } from '@/shared/ui';

import { useAzkarReminder } from '@/features/azkar/reminders/hooks';

import { useMyDuaCaption } from '../data/use-my-dua-caption';
import type { MyDua } from '../data/my-duas-repository';
import { duasHref } from '../routes';

const BELL = { ios: 'bell', android: 'notifications' } as const;

/**
 * One row on «أدعيتي» (screens/, #MyDuas): the number medallion, the dua's text, a one-line caption (title,
 * «من كتابتك», and the reminder time when one is set) and the reminder bell. The text is always the dua's body.
 */
export function MyDuaRow({
  dua,
  index,
  onBellPress,
  testID = 'my-dua-row',
}: {
  dua: MyDua;
  index: number;
  onBellPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = useContrastColors();
  const reminder = useAzkarReminder('my_dua', dua.id);
  const reminderSet = reminder?.enabled === true;
  const caption = useMyDuaCaption(dua.id, dua.title);
  const label = t('common.a11yTriple', { label: dua.body, title: caption, detail: t('duas.mine.open') });

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={() => router.push(duasHref.mineDetail(dua.id))}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceRaised,
        borderColor: colors.line,
        borderRadius: theme.radius.lg,
        borderWidth: theme.stroke.hairline,
        flexDirection: 'row',
        gap: theme.space[3],
        minHeight: theme.size.touchTarget,
        opacity: pressed ? theme.opacity.pressed : 1,
        padding: 14,
      })}
      testID={testID}
    >
      <NumberMedallion number={index + 1} testID={`${testID}-medallion`} />
      <View style={{ flex: 1, gap: theme.space[1] }}>
        <UiText numberOfLines={2} style={[displayText('dhikrList'), arabicTextDirection]} variant="body">
          {dua.body}
        </UiText>
        <UiText numberOfLines={1} tone="muted" testID={`${testID}-caption`} variant="caption">
          {caption}
        </UiText>
      </View>
      <IconButton
        hint={reminderSet ? t('duas.mine.reminderOnHint') : undefined}
        icon={BELL}
        label={t('duas.mine.reminder')}
        onPress={onBellPress}
        testID={`${testID}-bell`}
        tone={reminderSet ? 'brand' : 'muted'}
        variant="raised"
      />
    </Pressable>
  );
}
