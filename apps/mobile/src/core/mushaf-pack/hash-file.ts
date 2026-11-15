import { File } from 'expo-file-system';

/**
 * SHA-256 of a file, hashed natively in chunks. The bytes never reach JavaScript, which matters for a 90 MB pack.
 */
export function sha256File(path: string): Promise<string> {
  return new File(path).digest('SHA-256');
}
