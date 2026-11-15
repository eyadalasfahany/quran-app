import { sha256File } from './hash-file';

const mockDigest = jest.fn((_algorithm: string) => Promise.resolve('a'.repeat(64)));
const mockBytes = jest.fn();

// The platform hashes the file natively. The fake only records which call was made.
jest.mock('expo-file-system', () => ({
  File: class {
    digest(algorithm: string): Promise<string> {
      return mockDigest(algorithm);
    }

    bytes(): void {
      mockBytes();
    }
  },
}));

describe('sha256File', () => {
  it('asks the platform for a SHA-256 digest and never reads the bytes into JavaScript', async () => {
    await expect(sha256File('file:///documents/packs/svg-mushaf-hafs-1.db')).resolves.toBe('a'.repeat(64));

    expect(mockDigest).toHaveBeenCalledWith('SHA-256');
    expect(mockBytes).not.toHaveBeenCalled();
  });
});
