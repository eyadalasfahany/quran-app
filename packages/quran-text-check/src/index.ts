export class NotImplementedError extends Error {
  override readonly name = 'NotImplementedError';
}

// The checksum lands with the Tanzil seed in Phase 1. Until then this throws, so no
// caller can mistake the stub for a passing integrity check.
export function verify(): never {
  throw new NotImplementedError('quran-text-check is not implemented yet (Phase 1)');
}
