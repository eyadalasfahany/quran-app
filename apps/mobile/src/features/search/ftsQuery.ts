export function buildFtsMatch(tokens: readonly string[]): string | null {
  const quoted = tokens
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
    .map((token) => `"${token.replace(/"/gu, '""')}"*`);
  return quoted.length === 0 ? null : quoted.join(' ');
}
