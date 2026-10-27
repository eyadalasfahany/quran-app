declare module 'node:sqlite' {
  export class DatabaseSync {
    constructor(path: string, options?: { readOnly?: boolean });
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }

  export class StatementSync {
    run(...params: (string | number | bigint | null | Uint8Array)[]): unknown;
    get(...params: (string | number | bigint | null | Uint8Array)[]): Record<string, unknown> | undefined;
    all(...params: (string | number | bigint | null | Uint8Array)[]): Record<string, unknown>[];
  }
}

declare module 'node:child_process' {
  export function execFileSync(
    file: string,
    args: readonly string[],
    options?: {
      cwd?: string;
      encoding?: 'utf8';
      env?: Record<string, string | undefined>;
    },
  ): string;
}

declare module 'node:fs' {
  export function existsSync(path: string): boolean;
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void;
  export function mkdtempSync(prefix: string): string;
  export function readFileSync(path: string, encoding: 'utf8'): string;
  export function readFileSync(path: string): Uint8Array;
  export function rmSync(path: string, options?: { recursive?: boolean; force?: boolean }): void;
  export function writeFileSync(path: string, data: Uint8Array | string): void;
}

declare module 'node:crypto' {
  export interface Hash {
    update(data: Uint8Array): Hash;
    digest(encoding: 'hex'): string;
  }

  export function createHash(algorithm: 'sha256'): Hash;
}

declare module 'node:os' {
  export function tmpdir(): string;
}

declare module 'node:path' {
  export function join(...parts: string[]): string;
}
