import { useTranslation } from 'react-i18next';

import { SegmentedControl } from '@/shared/ui';

export type MyQuranTab = 'bookmarks' | 'highlights' | 'notes' | 'khatma';

// The My Quran sections (quran-app-screens.html, #MyQuran): bookmarks, highlights and notes.
// «ختمة» joins them disabled until step 3 builds the khatma planner.
export function MyQuranTabs({
  value,
  onChange,
  testID = 'my-quran-tabs',
}: {
  value: MyQuranTab;
  onChange: (tab: MyQuranTab) => void;
  testID?: string;
}) {
  const { t } = useTranslation();

  return (
    <SegmentedControl<MyQuranTab>
      label={t('myQuran.tabsLabel')}
      onChange={onChange}
      options={[
        { key: 'bookmarks', label: t('myQuran.tabs.bookmarks') },
        { key: 'highlights', label: t('myQuran.tabs.highlights') },
        { key: 'notes', label: t('myQuran.tabs.notes') },
        { key: 'khatma', label: t('myQuran.tabs.khatma'), disabled: true },
      ]}
      testID={testID}
      value={value}
    />
  );
}
