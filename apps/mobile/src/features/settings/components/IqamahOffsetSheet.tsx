import { useTranslation } from 'react-i18next';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatNumber, useLocale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { IQAMAH_OFFSET_OPTIONS, type IqamahOffsetMinutes } from '@/features/salah/data/iqamah-offset';
import { Icon, SheetHeader, UiText, type IconName } from '@/shared/ui';

const CHECK: IconName = { ios: 'checkmark', android: 'check' };

/**
 * Fixed iqamah offset choices (ADR 0056). A bottom sheet over Settings, same Modal pattern as the Salah location picker.
 */
export function IqamahOffsetSheet({
  visible,
  selected,
  onSelect,
  onClose,
  testID = 'iqamah-offset-sheet',
}: {
  visible: boolean;
  selected: IqamahOffsetMinutes;
  onSelect: (minutes: IqamahOffsetMinutes) => void;
  onClose: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locale = useLocale();
  const insets = useSafeAreaInsets();

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={{ backgroundColor: theme.colors.scrim, flex: 1, justifyContent: 'flex-end' }} testID={testID}>
        <Pressable accessible={false} onPress={onClose} style={{ bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 }} testID={`${testID}-backdrop`} />
        <View
          accessibilityViewIsModal
          style={{
            backgroundColor: theme.colors.surfacePage,
            borderTopLeftRadius: theme.radius.lg,
            borderTopRightRadius: theme.radius.lg,
            gap: theme.space[2],
            paddingBottom: Math.max(insets.bottom, theme.space[4]),
            paddingHorizontal: theme.space[4],
            paddingTop: theme.space[3],
          }}
        >
          <SheetHeader closeLabel={t('common.cancel')} closeTone="track" onClose={onClose} testID={`${testID}-header`} title={t('salah.iqamahOffset.sheetTitle')} />
          {IQAMAH_OFFSET_OPTIONS.map((minutes, index) => {
            const isSelected = minutes === selected;
            const label =
              minutes === 0
                ? t('salah.iqamahOffset.optionOff')
                : t('salah.iqamahOffset.after', { count: minutes, number: formatNumber(minutes, locale) });
            return (
              <Pressable
                accessibilityLabel={label}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected, selected: isSelected }}
                key={minutes}
                onPress={() => {
                  onSelect(minutes);
                  onClose();
                }}
                style={{
                  alignItems: 'center',
                  borderBottomColor: theme.colors.line,
                  borderBottomWidth: index < IQAMAH_OFFSET_OPTIONS.length - 1 ? theme.stroke.hairline : 0,
                  flexDirection: 'row',
                  gap: theme.space[3],
                  minHeight: theme.size.touchTarget,
                  paddingVertical: theme.space[2],
                }}
                testID={`${testID}-option-${minutes}`}
              >
                <UiText style={{ flex: 1 }} variant="body">
                  {label}
                </UiText>
                {isSelected ? <Icon color={theme.colors.brand} name={CHECK} size={20} testID={`${testID}-check-${minutes}`} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}
