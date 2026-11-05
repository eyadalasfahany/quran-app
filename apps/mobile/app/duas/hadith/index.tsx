import { useLocalSearchParams } from 'expo-router';

import { DuaHadithListScreen } from '@/features/duas/screens/DuaHadithListScreen';

function parseGroupId(raw: string | string[] | undefined): number | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function DuaHadithListRoute() {
  const { group } = useLocalSearchParams<{ group?: string }>();
  return <DuaHadithListScreen groupId={parseGroupId(group)} />;
}
