import { UiText } from '@/shared/ui';

/** The centred muted source line under a Quranic dua's verses: «{surah} · {range}» (quran-app-screens.html, #DuaQuranDetail). */
export function DuaQuranSourceLine({ text, testID = 'dua-quran-source-line' }: { text: string; testID?: string }) {
  return (
    <UiText align="center" testID={testID} tone="muted" variant="caption">
      {text}
    </UiText>
  );
}
