import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { setLocale, useLocale, type Locale } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { SegmentedControl } from '@/shared/ui';

import { SettingsGroup } from './SettingsGroup';

export function LanguageSection({
  locale: controlledLocale,
  onLocaleChange,
  testID = 'language-section',
}: {
  locale?: Locale;
  onLocaleChange?: (locale: Locale) => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const currentLocale = useLocale();
  const theme = useTheme();
  const activeLocale = controlledLocale ?? currentLocale;

  const handleChange = (newLocale: Locale) => {
    if (onLocaleChange) {
      onLocaleChange(newLocale);
    } else {
      setLocale(newLocale);
    }
  };

  return (
    <SettingsGroup testID={testID} title={t('settings.sections.language')}>
      <View style={{ padding: theme.space[2] }}>
        <SegmentedControl<Locale>
          label={t('settings.language.label')}
          onChange={handleChange}
          options={[
            { key: 'ar', label: t('settings.language.ar') },
            { key: 'en', label: t('settings.language.en') },
          ]}
          testID="language-selector"
          value={activeLocale}
        />
      </View>
    </SettingsGroup>
  );
}

