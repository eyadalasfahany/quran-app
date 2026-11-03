const BYTES_PER_MEGABYTE = 1024 * 1024;

/**
 * Converts bytes to megabytes with one decimal, as the storage summaries show.
 * Returns 0 for non-finite or non-positive inputs.
 */
export function megabytes(bytes: number): number {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return 0;
  }
  return Math.round((bytes / BYTES_PER_MEGABYTE) * 10) / 10;
}
