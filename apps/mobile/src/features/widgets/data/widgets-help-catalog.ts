import { WIDGET_ADD_CATALOG, type WidgetAddCatalogId } from './widget-add-catalog';

/** Help-screen rows: i18n key under `widgetsHelp.items.*` and the Android pin target. */
export const WIDGETS_HELP_CATALOG: readonly {
  readonly id: WidgetAddCatalogId;
  readonly provider: (typeof WIDGET_ADD_CATALOG)[number]['provider'];
}[] = WIDGET_ADD_CATALOG.map(({ id, provider }) => ({ id, provider }));
