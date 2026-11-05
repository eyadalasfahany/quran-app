import { Stack, useLocalSearchParams } from 'expo-router';

import { sheetScreenOptions } from '@/features/reader/form-sheet';
import { MyDuaEditorScreen } from '@/features/duas/screens/MyDuaEditorScreen';

function routeParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export default function MyDuaEditorRoute() {
  const params = useLocalSearchParams<{ id?: string; reminder?: string }>();
  const id = routeParam(params.id);
  const reminderOpen = routeParam(params.reminder) === '1';

  return (
    <>
      <Stack.Screen options={sheetScreenOptions} />
      <MyDuaEditorScreen duaId={id ?? null} reminderOpen={reminderOpen} />
    </>
  );
}
