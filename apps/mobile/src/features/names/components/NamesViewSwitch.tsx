import { useTranslation } from 'react-i18next';

import { SegmentedControl } from '@/shared/ui';

import type { NamesViewMode } from '../data/view-mode';

export function NamesViewSwitch({
  mode,
  onChange,
  testID = 'names-view-switch',
}: {
  mode: NamesViewMode;
  onChange: (mode: NamesViewMode) => void;
  testID?: string;
}) {
  const { t } = useTranslation();

  return (
    <SegmentedControl
      onChange={onChange}
      options={[
        { key: 'grid', label: t('names.list.viewGrid') },
        { key: 'list', label: t('names.list.viewList') },
      ]}
      testID={testID}
      value={mode}
    />
  );
}
