import type { ReciterEntry } from '@/features/audio/reciter-list';

import { isTrialReciter, onboardingReciterChoices } from './reciter-choices';

function reciter(resourceId: number, nameAr: string | null, isDefault = false): ReciterEntry {
  return {
    hasTimings: true,
    installed: false,
    isDefault,
    name: `Reciter ${resourceId}`,
    nameAr,
    resourceId,
    style: null,
  } as ReciterEntry;
}

const trial = reciter(176, 'أحمد عبدالحميد طاحون (تجريبي)');
const normal = reciter(1, 'عبد الباسط عبد الصمد', true);
const other = reciter(4, 'أبو بكر الشاطري');

describe('onboardingReciterChoices', () => {
  it('recognises a trial reciter by the suffix of its Arabic name and not a normal one', () => {
    expect(isTrialReciter(trial)).toBe(true);
    expect(isTrialReciter(normal)).toBe(false);
    expect(isTrialReciter({ nameAr: null })).toBe(false);
  });

  it('leaves trial reciters out of the choices', () => {
    const { choices } = onboardingReciterChoices([normal, trial, other], null);

    expect(choices.map((item) => item.resourceId)).toEqual([1, 4]);
  });

  it('keeps the saved reciter selected when it is offered', () => {
    expect(onboardingReciterChoices([normal, other], 4).selectedId).toBe(4);
  });

  it('falls back to the default normal reciter when the saved one is a trial reciter', () => {
    expect(onboardingReciterChoices([normal, trial, other], 176).selectedId).toBe(1);
  });
});
