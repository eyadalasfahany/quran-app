import { useTranslation } from 'react-i18next';

import { SegmentedControl } from '@/shared/ui';

import type { ReaderMode } from '../../anchor/reading-anchor';

export function ModePicker({
  value,
  onChange,
  testID = 'reader-mode-picker',
}: {
  value: ReaderMode;
  onChange: (mode: ReaderMode) => void;
  testID?: string;
}) {
  const { t } = useTranslation();

  return (
    <SegmentedControl
      label={t('reader.settings.modeLabel')}
      onChange={onChange}
      options={[
        { key: 'mushaf', label: t('reader.settings.modes.mushaf') },
        { key: 'reading', label: t('reader.settings.modes.reading') },
        { key: 'focus', label: t('reader.settings.modes.focus') },
      ]}
      testID={testID}
      value={value}
    />
  );
}
