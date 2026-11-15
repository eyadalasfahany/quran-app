import { useLocalSearchParams } from 'expo-router';

import { parseCategoryItemIndex } from '@/features/duas/data/category-pager';
import { DuaCategoryItemScreen } from '@/features/duas/screens/DuaCategoryItemScreen';

function routeParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

/** One dua of a Duas category, by its position in the category (ADR 0091 decision 11). */
export default function DuasCategoryItemRoute() {
  const params = useLocalSearchParams<{ id: string; index: string }>();
  const index = parseCategoryItemIndex(routeParam(params.index)) ?? -1;

  return <DuaCategoryItemScreen categoryId={routeParam(params.id)} index={index} />;
}
