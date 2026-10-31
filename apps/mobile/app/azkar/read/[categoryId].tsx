import { useLocalSearchParams } from 'expo-router';

import { AzkarReaderScreen } from '@/features/azkar/screens/AzkarReaderScreen';

function routeParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

export default function AzkarCategoryReaderRoute() {
  const params = useLocalSearchParams<{ categoryId: string; unit?: string }>();
  const unit = params.unit === undefined ? undefined : routeParam(params.unit);
  return <AzkarReaderScreen scope={{ categoryId: routeParam(params.categoryId), kind: 'category' }} startUnitKey={unit} />;
}
