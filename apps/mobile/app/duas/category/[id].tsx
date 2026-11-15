import { useLocalSearchParams } from 'expo-router';

import { DuasCategoryScreen } from '@/features/duas/screens/DuasCategoryScreen';

function routeParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

export default function DuasCategoryRoute() {
  const params = useLocalSearchParams<{ id: string }>();
  return <DuasCategoryScreen categoryId={routeParam(params.id)} />;
}
