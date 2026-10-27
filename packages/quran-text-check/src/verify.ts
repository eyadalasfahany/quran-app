import { ayahChecksum } from './checksum.ts';
import {
  AYAH_COUNT,
  SURAH_COUNT,
  TANZIL_FILE_SHA256,
  TANZIL_METADATA_SHA256,
  TANZIL_UTHMANI_CHECKSUM,
} from './constants.ts';
import { loadTanzil, type Ayah, type TanzilLoad, type TanzilMetadata } from './tanzil.ts';

export type VerifyResult = {
  ok: boolean;
  failures: string[];
};

export function verifyTanzil(loaded?: TanzilLoad): VerifyResult {
  const source = loaded ?? loadTanzil();
  const failures: string[] = [];

  if (source.fileSha256 !== TANZIL_FILE_SHA256) {
    failures.push(`text file hash is ${source.fileSha256}, expected ${TANZIL_FILE_SHA256}`);
  }

  if (source.metadataSha256 !== TANZIL_METADATA_SHA256) {
    failures.push(`metadata file hash is ${source.metadataSha256}, expected ${TANZIL_METADATA_SHA256}`);
  }

  if (source.ayahs.length !== AYAH_COUNT) {
    failures.push(`ayah count is ${source.ayahs.length}, expected ${AYAH_COUNT}`);
  }

  const counts = suraCounts(source.ayahs);

  if (counts.size !== SURAH_COUNT || source.metadata.suras.length !== SURAH_COUNT) {
    failures.push(
      `sura count is ${counts.size} in the text and ${source.metadata.suras.length} in the metadata, expected ${SURAH_COUNT}`,
    );
  }

  failures.push(...suraCountFailures(source.metadata, counts));

  const checksum = ayahChecksum(source.ayahs.map((ayah) => ayah.text));

  if (checksum !== TANZIL_UTHMANI_CHECKSUM) {
    failures.push(`checksum is ${checksum}, expected ${TANZIL_UTHMANI_CHECKSUM}`);
  }

  return {
    ok: failures.length === 0,
    failures,
  };
}

function suraCounts(ayahs: readonly Ayah[]): Map<number, number> {
  const counts = new Map<number, number>();

  for (const ayah of ayahs) {
    counts.set(ayah.sura, (counts.get(ayah.sura) ?? 0) + 1);
  }

  return counts;
}

function suraCountFailures(metadata: TanzilMetadata, counts: Map<number, number>): string[] {
  const failures: string[] = [];
  const seen = new Set<number>();

  for (const sura of metadata.suras) {
    seen.add(sura.index);
    const actual = counts.get(sura.index) ?? 0;

    if (actual !== sura.ayas) {
      failures.push(`sura ${sura.index} ayah count is ${actual}, expected ${sura.ayas}`);
    }
  }

  for (const sura of counts.keys()) {
    if (!seen.has(sura)) {
      failures.push(`sura ${sura} ayah count is missing from the metadata`);
    }
  }

  return failures;
}
