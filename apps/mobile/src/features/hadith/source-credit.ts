/** The i18n key of the source credit for one hadith row, from its `source_code` (ADR 0076). */
export type HadithCreditKey =
  | 'hadith.source.credit'
  | 'hadith.source.creditOpeniti'
  | 'hadith.source.creditHadithapicom'
  | 'hadith.source.creditMeeatif'
  | 'hadith.source.creditHadithjson';

/**
 * A row's own credit. Null or `fawazahmed0` (and any unknown code) gives the collection's credit; `openiti` and
 * `hadithapicom`, `meeatif` and `hadithjson` give the credit of the filled text.
 */
export function hadithCreditKey(sourceCode: string | null | undefined): HadithCreditKey {
  switch (sourceCode) {
    case 'openiti':
      return 'hadith.source.creditOpeniti';
    case 'hadithapicom':
      return 'hadith.source.creditHadithapicom';
    case 'meeatif':
      return 'hadith.source.creditMeeatif';
    case 'hadithjson':
      return 'hadith.source.creditHadithjson';
    default:
      return 'hadith.source.credit';
  }
}

/** `source_code` of a placeholder row: no source has this hadith yet (ADR 0076). Its text is empty. */
export const UNAVAILABLE_SOURCE_CODE = 'unavailable';

export function isUnavailableHadith(sourceCode: string | null | undefined): boolean {
  return sourceCode === UNAVAILABLE_SOURCE_CODE;
}
