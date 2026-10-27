export type SqlValue = string | number | null | Uint8Array;

export type SqlExecutor = {
  exec(sql: string): void;
  run(sql: string, params?: readonly SqlValue[]): void;
  get<T>(sql: string, params?: readonly SqlValue[]): T | undefined;
  all<T>(sql: string, params?: readonly SqlValue[]): T[];
  transaction<T>(fn: () => T): T;
};
