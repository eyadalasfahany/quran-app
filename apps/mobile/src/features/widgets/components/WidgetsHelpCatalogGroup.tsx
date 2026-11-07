import { useTranslation } from 'react-i18next';

import { SettingsGroup } from '@/features/settings/components/SettingsGroup';

import { WIDGETS_HELP_CATALOG } from '../data/widgets-help-catalog';
import { WidgetsHelpWidgetRow } from './WidgetsHelpWidgetRow';

/** Lists every home-screen widget and what it shows (screens/, #WidgetsHelp). */
export function WidgetsHelpCatalogGroup({ testID = 'widgets-help-catalog' }: { testID?: string }) {
  const { t } = useTranslation();

  return (
    <SettingsGroup testID={testID} title={t('widgetsHelp.sections.catalog')}>
      {WIDGETS_HELP_CATALOG.map(({ id }) => (
        <WidgetsHelpWidgetRow
          key={id}
          subtitle={t(`widgetsHelp.items.${id}.body`)}
          testID={`widgets-help-item-${id}`}
          title={t(`widgetsHelp.items.${id}.title`)}
        />
      ))}
    </SettingsGroup>
  );
}
