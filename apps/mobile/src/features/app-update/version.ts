// Dotted numeric versions only: "1", "1.0.2", "1.10.0". Anything else is not a version we can compare.
const VERSION_PATTERN = /^\d+(\.\d+)*$/;

/**
 * True when the installed version is below the API's minimum (ADR 0060). A missing or unreadable version on either
 * side returns false, so the app is never blocked by a value it can't compare.
 */
export function isUpdateRequired(current: string | null, minimum: string | null): boolean {
  if (current === null || minimum === null) {
    return false;
  }
  if (!VERSION_PATTERN.test(current) || !VERSION_PATTERN.test(minimum)) {
    return false;
  }
  return compareVersions(current, minimum) < 0;
}

// Negative when a < b, zero when equal, positive when a > b. Missing segments count as 0, so 1.0 equals 1.0.0.
function compareVersions(a: string, b: string): number {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }
  return 0;
}
