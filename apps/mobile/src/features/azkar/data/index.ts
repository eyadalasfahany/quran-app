export {
  useAzkarAvailable,
  useAzkarCategories,
  useAzkarFontScale,
  useAzkarSearch,
  useCategoryUnits,
  useContinueScope,
  useEntry,
  useFavorites,
  useIsFavorite,
  useScopeProgress,
  useVariationChoices,
} from './hooks';
export { azkarShareText } from './share-text';
export { buildReaderUnits, buildCategoryUnits } from './reader-units';
export type { ReaderUnit, ReaderUnitKind } from './reader-units';
export {
  applyTap,
  categoryProgress,
  periodKey,
  pickLastActiveScope,
  scopeKeyForCategory,
  scopeKeyForEntry,
  TAP_GUARD_MS,
} from './progress';
export type { TapResult, TapState } from './progress';
export { loadAzkarDevFixtures, azkarDevFixturesEnabled } from './dev-fixtures';
export { readAzkarFontScale, saveAzkarFontScale, stepAzkarFontScale } from './font-scale';
export type { AzkarEntryDetail, AzkarCategoryListItem, AzkarItemDetail, AzkarVariation } from './model';
export type { VariationOverrides } from './content-repository';
export { getVariationChoices, setVariationChoice } from './variation-choice';
export type { VariationChoices } from './variation-choice';
