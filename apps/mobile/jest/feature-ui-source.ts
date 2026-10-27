import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const rawColor = /#[0-9a-fA-F]{3,8}\b|\brgba?\(/g;

export function rawColorLiteralsInFeature(relativePath: string): string[] {
  return readFileSync(join(process.cwd(), relativePath), 'utf8').match(rawColor) ?? [];
}
