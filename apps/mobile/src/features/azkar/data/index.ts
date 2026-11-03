export {
  useAzkarAvailable,
  useAzkarCategories,
  useAzkarCategory,
  useAzkarFontScale,
  useAzkarProgressSummaries,
  useAzkarSearch,
  useCategoryUnits,
  useContinueAzkar,
  useContinueScope,
  useEntry,
  useFavoriteCards,
  useFavorites,
  useIsFavorite,
  useQuranReferenceLabel,
  useRecentAzkarItems,
  useScopeProgress,
  useSessionCategoryProgress,
  useVariationChoices,
} from './hooks';
export type { RecentAzkarItem, SessionCategoryProgress } from './hooks';
export { categoryPeriodProgress } from './category-progress';
export type { CategoryPeriodProgress } from './category-progress';
export { clearRecentScopes, readRecentScopes, recordRecentScope, RECENT_SCOPES_CAP, useRecentScopes } from './recent-scopes';
export type { RecentScope } from './recent-scopes';
export { azkarShareText } from './share-text';
export { buildReaderUnits, buildCategoryUnits } from './reader-units';
export type { ReaderUnit, ReaderUnitKind } from './reader-units';
export { buildCategoryCards } from './category-cards';
export type { CategoryCard } from './category-cards';
export { listFavoriteCards } from './favorite-cards';
export type { FavoriteCard } from './favorite-cards';
export { resolveAzkarScope } from './scope-resolver';
export type { ResolvedAzkarScope } from './scope-resolver';
export { firstArabicText } from './preview';
export {
  addAzkarRecentSearch,
  clearAzkarRecentSearches,
  readAzkarRecentSearches,
  removeAzkarRecentSearch,
} from './recent-searches';
export {
  applyTap,
  categoryProgress,
  completedUnitsIn,
  periodKey,
  pickLastActiveScope,
  scopeKeyForCategory,
  scopeKeyForEntry,
  TAP_GUARD_MS,
} from './progress';
export type { TapResult, TapState } from './progress';
export { readAzkarFontScale, saveAzkarFontScale, stepAzkarFontScale } from './font-scale';
export type { AzkarEntryDetail, AzkarCategoryListItem, AzkarItemDetail, AzkarVariation } from './model';
export type { VariationOverrides } from './content-repository';
export { getVariationChoices, setVariationChoice } from './variation-choice';
export type { VariationChoices } from './variation-choice';
