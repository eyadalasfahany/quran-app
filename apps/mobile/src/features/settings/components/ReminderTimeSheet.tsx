import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Button } from '@/shared/ui/Button';

/**
 * Time picker for the daily reminder. Android shows the platform dialog; on iOS the spinner
 * expands inline under the row, as pickers do in the Settings app, and «إلغاء» / «تم» commit or
 * discard the draft instead of applying every turn of the wheel.
 */
export function ReminderTimeSheet({
  value,
  onPick,
  onClose,
  testID,
}: {
  value: Date;
  onPick: (date: Date) => void;
  onClose: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [draft, setDraft] = useState(value);

  const handleChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (date !== undefined) {
      setDraft(date);
    }
  };

  if (Platform.OS === 'android') {
    const handleEvent = (event: DateTimePickerEvent, date?: Date) => {
      if (event.type === 'set' && date !== undefined) {
        onPick(date);
      } else {
        onClose();
      }
    };
    return <DateTimePicker mode="time" onChange={handleEvent} testID={testID} value={value} />;
  }

  return (
    <View
      style={{
        backgroundColor: theme.colors.surfaceRaised,
        borderColor: theme.colors.line,
        borderRadius: theme.radius.card,
        borderWidth: theme.stroke.hairline,
        gap: theme.space[2],
        marginTop: theme.space[2],
        padding: theme.space[3],
      }}
    >
      <DateTimePicker
        display="spinner"
        mode="time"
        onChange={handleChange}
        testID={testID}
        textColor={theme.colors.ink}
        value={draft}
      />
      <View style={{ flexDirection: 'row', gap: theme.space[3] }}>
        <Button label={t('common.cancel')} onPress={onClose} stretch style={{ flex: 1 }} variant="ghost" />
        <Button
          label={t('common.done')}
          onPress={() => onPick(draft)}
          stretch
          style={{ flex: 1 }}
          testID={testID !== undefined ? `${testID}-done` : undefined}
          variant="primary"
        />
      </View>
    </View>
  );
}
