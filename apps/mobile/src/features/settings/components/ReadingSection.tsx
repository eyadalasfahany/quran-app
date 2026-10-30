import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { readDarkAfterMaghrib, saveDarkAfterMaghrib } from '@/core/theme/appearance';
import { ListRow, ToggleRow, UiText } from '@/shared/ui';

import { SettingsGroup } from './SettingsGroup';

export function ReadingSection({
  onPressQuranFont,
  onPressAppearance,
  onPressTafsir,
  darkAfterMaghrib: controlledDark,
  onDarkAfterMaghribChange,
  fontValue,
  appearanceValue,
  tafsirValue,
  testID = 'reading-section',
}: {
  onPressQuranFont?: () => void;
  onPressAppearance?: () => void;
  onPressTafsir?: () => void;
  darkAfterMaghrib?: boolean;
  onDarkAfterMaghribChange?: (value: boolean) => void;
  fontValue?: string;
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
        onPress={onPressQuranFont}
        separator="line"
        testID="reading-font-row"
        title={t('settings.reading.quranFont')}
        trailing={
          <UiText tone="muted" variant="subhead">
            {fontValue ?? t('settings.reading.quranFontValue')}
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
