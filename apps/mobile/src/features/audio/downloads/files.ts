import { File, Paths } from 'expo-file-system';

// `downloads.local_path` is relative to the document directory. The app container's absolute path can change
// between launches (an iOS update moves it), so the absolute URI is built here, at use.
const AUDIO_DIRECTORY = 'audio';

/** The relative path for one surah: `audio/{reciterResourceId}/{chapterId}.{format}`. */
export function downloadPathFor(reciterResourceId: number, chapterId: number, format: string): string {
  return `${AUDIO_DIRECTORY}/${reciterResourceId}/${chapterId}.${format}`;
}

/** The reciter's folder, which holds all of its downloaded surahs. */
export function reciterDirectoryPath(reciterResourceId: number): string {
  return `${AUDIO_DIRECTORY}/${reciterResourceId}`;
}

/** The file for a row's `local_path`, under the current document directory. */
export function fileForDownloadPath(localPath: string): File {
  return new File(Paths.document, localPath);
}
