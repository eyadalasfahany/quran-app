import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { arabicTextDirection, displayText, IconButton, NumberMedallion, UiText, useContrastColors } from '@/shared/ui';

import { useAzkarReminder } from '@/features/azkar/reminders/hooks';

import type { MyDua } from '../data/my-duas-repository';
import { duasHref } from '../routes';

const BELL = { ios: 'bell', android: 'notifications' } as const;
const BELL_FILL = { ios: 'bell.fill', android: 'notifications' } as const;

function previewText(dua: MyDua): string {
  const titled = dua.title?.trim();
  return titled && titled.length > 0 ? titled : dua.body;
}

/** One row on «أدعيتي» (quran-app-screens.html, #MyDuas): gold badge, caption, reminder bell. */
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
  const preview = previewText(dua);
  const caption = t('duas.mine.writtenByYou');
  const reminderSet = reminder?.enabled === true;
  const label = t('common.a11yTriple', { label: preview, title: caption, detail: t('duas.mine.open') });

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={() => router.push(duasHref.mineEdit(dua.id))}
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
          {preview}
        </UiText>
        <UiText tone="muted" variant="caption">
          {caption}
        </UiText>
      </View>
      <IconButton
        icon={reminderSet ? BELL_FILL : BELL}
        label={t('duas.mine.reminder')}
        onPress={onBellPress}
        pressed={reminderSet}
        testID={`${testID}-bell`}
        variant="raised"
      />
    </Pressable>
  );
}
