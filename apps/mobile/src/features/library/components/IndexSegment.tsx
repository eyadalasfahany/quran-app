import { useTranslation } from 'react-i18next';

import { SegmentedControl } from '@/shared/ui';

export type IndexSegmentKey = 'surahs' | 'juz';

export function IndexSegment({
  value,
  onChange,
  testID,
}: {
  value: IndexSegmentKey;
  onChange: (key: IndexSegmentKey) => void;
  testID?: string;
}) {
  const { t } = useTranslation();

  return (
    <SegmentedControl<IndexSegmentKey>
      label={t('library.index.segmentLabel')}
      onChange={onChange}
      options={[
        { key: 'surahs', label: t('library.index.segments.surahs') },
        { key: 'juz', label: t('library.index.segments.juz') },
      ]}
      testID={testID}
      value={value}
    />
  );
}
