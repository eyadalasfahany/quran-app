import { useTranslation } from 'react-i18next';

import { SegmentedControl } from '@/shared/ui';

import type { PanelTab } from '../selection';

export function PanelTabs({
  value,
  onChange,
  testID,
}: {
  value: PanelTab;
  onChange: (tab: PanelTab) => void;
  testID?: string;
}) {
  const { t } = useTranslation();

  return (
    <SegmentedControl
      label={t('reader.panel.tabsLabel')}
      onChange={onChange}
      options={[
        { key: 'actions', label: t('reader.panel.tabs.actions') },
        { key: 'tafsir', label: t('reader.panel.tabs.tafsir') },
        { key: 'translation', label: t('reader.panel.tabs.translation') },
      ]}
      testID={testID}
      value={value}
    />
  );
}
