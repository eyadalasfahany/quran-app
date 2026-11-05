/**
 * `dua_hadith.hints` holds a JSON array string. The array's string elements are returned unchanged. A null or blank
 * value gives no hints. Text that is not a JSON array is kept as one hint, so nothing is dropped and no raw JSON shows.
 */
export function parseDuaHints(raw: string | null): string[] {
  if (raw === null || raw.trim().length === 0) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [raw];
  }

  if (!Array.isArray(parsed)) {
    return [raw];
  }

  return parsed.filter((element): element is string => typeof element === 'string');
}
