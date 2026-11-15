import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { readDarkAfterMaghrib, saveDarkAfterMaghrib } from '@/core/theme/appearance';
import { DEFAULT_MUSHAF } from '@/features/reader/mushafs';
import { ListRow, ToggleRow, UiText } from '@/shared/ui';

import { SettingsGroup } from './SettingsGroup';

export function ReadingSection({
  onPressMushaf,
  onPressAppearance,
  onPressTafsir,
  darkAfterMaghrib: controlledDark,
  onDarkAfterMaghribChange,
  mushafValue,
  appearanceValue,
  tafsirValue,
  testID = 'reading-section',
}: {
  onPressMushaf?: () => void;
  onPressAppearance?: () => void;
  onPressTafsir?: () => void;
  darkAfterMaghrib?: boolean;
  onDarkAfterMaghribChange?: (value: boolean) => void;
  mushafValue?: string;
  appearanceValue?: string;
  tafsirValue?: string;
  testID?: string;
}) {
  const { t } = useTranslation();
  const [internalDark, setInternalDark] = useState(() => readDarkAfterMaghrib());

  const isDarkAfterMaghrib = controlledDark ?? internalDark;

  const handleDarkToggle = (val: boolean) => {
    if (onDarkAfterMaghribChange) {
      onDarkAfterMaghribChange(val);
    } else {
      saveDarkAfterMaghrib(val);
      setInternalDark(val);
    }
  };

  return (
    <SettingsGroup testID={testID} title={t('settings.sections.reading')}>
      <ListRow
        chevron
        onPress={onPressMushaf}
        separator="line"
        testID="reading-mushaf-row"
        title={t('settings.reading.mushaf')}
        trailing={
          <UiText tone="muted" variant="subhead">
            {mushafValue ?? t(`reader.mushafs.${DEFAULT_MUSHAF}.name`)}
          </UiText>
        }
      />
      <ListRow
        chevron
        onPress={onPressAppearance}
        separator="line"
        testID="reading-appearance-row"
        title={t('settings.reading.appearance')}
        trailing={
          <UiText tone="muted" variant="subhead">
            {appearanceValue ?? t('settings.reading.appearanceValue')}
          </UiText>
        }
      />
      <ToggleRow
        onValueChange={handleDarkToggle}
        separator="line"
        testID="dark-after-maghrib-toggle"
        title={t('settings.reading.darkAfterMaghrib')}
        value={isDarkAfterMaghrib}
      />
      <ListRow
        chevron
        onPress={onPressTafsir}
        testID="reading-tafsir-row"
        title={t('settings.reading.defaultTafsir')}
        trailing={
          <UiText tone="muted" variant="subhead">
            {tafsirValue ?? t('settings.reading.defaultTafsirValue')}
          </UiText>
        }
      />
    </SettingsGroup>
  );
}
