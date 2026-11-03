import { router, type Href } from 'expo-router';

import { Button } from '@/shared/ui';

/** Opens the Mushaf reader at `verseFrom` (ADR 0055 §2: navigation only, no audio on this screen). */
export function DuaOpenInMushafButton({
  surah,
  verseFrom,
  label,
  testID = 'dua-open-in-mushaf',
}: {
  surah: number;
  verseFrom: number;
  label: string;
  testID?: string;
}) {
  const href = `/read/${surah}:${verseFrom}` as Href;

  return (
    <Button
      label={label}
      onPress={() => router.push(href)}
      stretch
      testID={testID}
      variant="primary"
    />
  );
}
