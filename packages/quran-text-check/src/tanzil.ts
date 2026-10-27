import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEXT_FILE = 'tanzil-quran-uthmani-1.1.txt';
const SIMPLE_FILE = 'tanzil-quran-simple-1.1.txt';
const METADATA_FILE = 'tanzil-quran-data-1.0.xml';

export type Ayah = {
  sura: number;
  aya: number;
  text: string;
};

export type SuraMetadata = {
  index: number;
  ayas: number;
  start: number;
  name: string;
  tname: string;
  ename: string;
  type: string;
  order: number;
  rukus: number;
};

export type VerseStart = {
  sura: number;
  aya: number;
};

export type Sajda = {
  sura: number;
  aya: number;
  type: string;
};

export type TanzilMetadata = {
  suras: SuraMetadata[];
  juzs: VerseStart[];
  hizbs: VerseStart[];
  manzils: VerseStart[];
  rukus: VerseStart[];
  pages: VerseStart[];
  sajdas: Sajda[];
};

export type TanzilLoad = {
  fileSha256: string;
  simpleFileSha256: string;
  metadataSha256: string;
  ayahs: Ayah[];
  simpleAyahs: Ayah[];
  metadata: TanzilMetadata;
};

class TanzilParseError extends Error {
  override readonly name = 'TanzilParseError';
}

export function parseTanzilText(content: string): Ayah[] {
  const ayahs: Ayah[] = [];

  for (const line of content.split('\n')) {
    if (line === '' || line.startsWith('#')) {
      continue;
    }

    const first = line.indexOf('|');
    const second = first === -1 ? -1 : line.indexOf('|', first + 1);

    if (first <= 0 || second <= first + 1) {
      throw new TanzilParseError('A Tanzil line does not have sura, ayah and text separators.');
    }

    ayahs.push({
      sura: integerToken(line.slice(0, first), 'sura'),
      aya: integerToken(line.slice(first + 1, second), 'ayah'),
      text: line.slice(second + 1),
    });
  }

  return ayahs;
}

export function parseTanzilMetadata(xml: string): TanzilMetadata {
  return {
    suras: elements(xml, 'sura').map(parseSura),
    juzs: elements(xml, 'juz').map((attrs) => verseStart(attrs, 'juz')),
    hizbs: elements(xml, 'quarter').map((attrs) => verseStart(attrs, 'quarter')),
    manzils: elements(xml, 'manzil').map((attrs) => verseStart(attrs, 'manzil')),
    rukus: elements(xml, 'ruku').map((attrs) => verseStart(attrs, 'ruku')),
    pages: elements(xml, 'page').map((attrs) => verseStart(attrs, 'page')),
    sajdas: elements(xml, 'sajda').map(parseSajda),
  };
}

export function loadTanzil(dataDir?: string): TanzilLoad {
  const dir = dataDir ?? packageDataDir();
  const textBytes = readFileSync(join(dir, TEXT_FILE));
  const simpleBytes = readFileSync(join(dir, SIMPLE_FILE));
  const metadataBytes = readFileSync(join(dir, METADATA_FILE));

  return {
    fileSha256: createHash('sha256').update(textBytes).digest('hex'),
    simpleFileSha256: createHash('sha256').update(simpleBytes).digest('hex'),
    metadataSha256: createHash('sha256').update(metadataBytes).digest('hex'),
    ayahs: parseTanzilText(textBytes.toString('utf8')),
    simpleAyahs: parseTanzilText(simpleBytes.toString('utf8')),
    metadata: parseTanzilMetadata(metadataBytes.toString('utf8')),
  };
}

function packageDataDir(): string {
  return join(dirname(fileURLToPath(import.meta.url)), '../data');
}

function integerToken(value: string, label: string): number {
  if (!/^[0-9]+$/.test(value)) {
    throw new TanzilParseError(`A Tanzil line does not have a numeric ${label}.`);
  }

  return Number(value);
}

function elements(xml: string, tag: string): Array<Record<string, string>> {
  const pattern = new RegExp(`<${tag}\\b([^>]*)\\/>`, 'g');
  const found: Array<Record<string, string>> = [];

  for (const match of xml.matchAll(pattern)) {
    found.push(attributes(match[1] ?? ''));
  }

  return found;
}

function attributes(source: string): Record<string, string> {
  const attrs: Record<string, string> = {};

  for (const match of source.matchAll(/([A-Za-z_][\w:-]*)="([^"]*)"/g)) {
    const name = match[1];
    const value = match[2];

    if (name === undefined || value === undefined) {
      continue;
    }

    attrs[name] = value;
  }

  return attrs;
}

function parseSura(attrs: Record<string, string>): SuraMetadata {
  return {
    index: integerAttribute(attrs, 'index', 'sura'),
    ayas: integerAttribute(attrs, 'ayas', 'sura'),
    start: integerAttribute(attrs, 'start', 'sura'),
    name: stringAttribute(attrs, 'name', 'sura'),
    tname: stringAttribute(attrs, 'tname', 'sura'),
    ename: stringAttribute(attrs, 'ename', 'sura'),
    type: stringAttribute(attrs, 'type', 'sura'),
    order: integerAttribute(attrs, 'order', 'sura'),
    rukus: integerAttribute(attrs, 'rukus', 'sura'),
  };
}

function verseStart(attrs: Record<string, string>, tag: string): VerseStart {
  return {
    sura: integerAttribute(attrs, 'sura', tag),
    aya: integerAttribute(attrs, 'aya', tag),
  };
}

function parseSajda(attrs: Record<string, string>): Sajda {
  return {
    sura: integerAttribute(attrs, 'sura', 'sajda'),
    aya: integerAttribute(attrs, 'aya', 'sajda'),
    type: stringAttribute(attrs, 'type', 'sajda'),
  };
}

function integerAttribute(attrs: Record<string, string>, name: string, tag: string): number {
  const value = attrs[name];

  if (value === undefined || !/^[0-9]+$/.test(value)) {
    throw new TanzilParseError(`Tanzil metadata ${tag} is missing a numeric ${name}.`);
  }

  return Number(value);
}

function stringAttribute(attrs: Record<string, string>, name: string, tag: string): string {
  const value = attrs[name];

  if (value === undefined) {
    throw new TanzilParseError(`Tanzil metadata ${tag} is missing ${name}.`);
  }

  return value;
}
