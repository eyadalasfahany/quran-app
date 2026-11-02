import type { TFunction } from 'i18next';

import type { WidgetLabels } from './types';

/**
 * Every label the widgets show, from the `widgets` key group in `ar.json` / `en.json` (ADR 0035 §1.5). The app resolves
 * them in its own language and writes them into the snapshot, so a widget never needs an i18n runtime.
 */
export function buildWidgetLabels(t: TFunction): WidgetLabels {
  return {
    azkarEmpty: t('widgets.azkarEmpty'),
    azkarTitle: t('widgets.azkarTitle'),
    complete: t('widgets.complete'),
    continueReading: t('widgets.continueReading'),
    countAction: t('widgets.countAction'),
    misbaha: t('widgets.misbaha'),
    misbahaNoTarget: t('widgets.misbahaNoTarget'),
    nextPrayer: t('widgets.nextPrayer'),
    noLocation: t('widgets.noLocation'),
    of: t('widgets.of'),
    openApp: t('widgets.openApp'),
    prayerAsr: t('widgets.prayers.asr'),
    prayerDhuhr: t('widgets.prayers.dhuhr'),
    prayerFajr: t('widgets.prayers.fajr'),
    prayerIsha: t('widgets.prayers.isha'),
    prayerMaghrib: t('widgets.prayers.maghrib'),
    progressEmpty: t('widgets.progressEmpty'),
    progressTitle: t('widgets.progressTitle'),
    remaining: t('widgets.remaining'),
    resume: t('widgets.resume'),
    stale: t('widgets.stale'),
    wirdTitle: t('widgets.wirdTitle'),
    wirdUnit: t('widgets.wirdUnit'),
    ayahLabel: t('widgets.ayahLabel'),
    pageLabel: t('widgets.pageLabel'),
  };
}
