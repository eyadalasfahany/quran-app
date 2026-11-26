import { defaultReciterId, resolveReciterId } from '@/features/audio/settings-model';
import type { ReciterEntry } from '@/features/audio/reciter-list';

/** The Arabic display name of a reciter in trial ends «(تجريبي)» (config/quran.php, reciter_display_names). The API has no flag. */
// shortcut: matches the display-name suffix, upgrade to an `is_trial` manifest field when the API contract next changes.
const TRIAL_SUFFIX = '(تجريبي)';

export function isTrialReciter(reciter: Pick<ReciterEntry, 'nameAr'>): boolean {
  return reciter.nameAr?.trim().endsWith(TRIAL_SUFFIX) ?? false;
}

/**
 * The reciters onboarding offers: trial reciters are left out. The selection is the saved one when it is offered,
 * otherwise the default, so a trial reciter saved elsewhere shows the normal default here.
 */
export function onboardingReciterChoices(
  reciters: ReciterEntry[],
  savedId: number | null,
): { choices: ReciterEntry[]; selectedId: number | null } {
  const choices = reciters.filter((reciter) => !isTrialReciter(reciter));
  return { choices, selectedId: resolveReciterId(savedId, choices, defaultReciterId(choices)) };
}
