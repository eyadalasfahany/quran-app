import { useLocalSearchParams } from 'expo-router';

import { AzkarCategoryScreen } from '@/features/azkar/screens/AzkarCategoryScreen';

function routeParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

export default function AzkarCategoryRoute() {
  const params = useLocalSearchParams<{ id: string }>();
  return <AzkarCategoryScreen categoryId={routeParam(params.id)} />;
}
