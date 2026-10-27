import { useTranslation } from 'react-i18next';

import { SectionScreen } from '@/core/layout';

export default function MyQuranScreen() {
  const { t } = useTranslation();
  return <SectionScreen testID="screen-my-quran" title={t('tabs.myQuran')} />;
}
