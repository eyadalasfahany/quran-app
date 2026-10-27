import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Paths are relative to apps/mobile, where Jest runs.
export const sharedUiDir = join('src', 'shared', 'ui');

const rawColor = /#[0-9a-fA-F]{3,8}\b|\brgba?\(/g;

export function sharedUiFiles(): string[] {
  return readdirSync(sharedUiDir).filter((file) => /\.tsx?$/.test(file));
}

// Colours come from useTheme(); a literal in a component file is a bug.
export function rawColorLiterals(file: string): string[] {
  return readFileSync(join(sharedUiDir, file), 'utf8').match(rawColor) ?? [];
}
