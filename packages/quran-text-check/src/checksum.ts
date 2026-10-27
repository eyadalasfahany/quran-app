import { createHash } from 'node:crypto';

export function ayahChecksum(texts: readonly string[]): string {
  return createHash('sha256').update(texts.join('\n'), 'utf8').digest('hex');
}
