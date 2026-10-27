import { mkdirSync, renameSync, rmSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  TANZIL_UTHMANI_CHECKSUM,
  buildChapterBismillah,
  buildWordMap,
  loadTanzil,
  normalizeForSearch,
  splitBasmala,
  verifyTanzil,
} from '../../../packages/quran-text-check/src/index.ts';

const CHAPTER_COLUMNS = [
  'id',
  'name_arabic',
  'name_simple',
  'name_en',
  'revelation_place',
  'revelation_order',
  'verses_count',
  'bismillah_pre',
  'bismillah_text',
  'bismillah_imlaei',
  'page_start',
  'page_end',
];

const VERSE_COLUMNS = [
  'id',
  'verse_key',
  'chapter_id',
  'verse_number',
  'juz',
  'hizb',
  'rub_el_hizb',
  'page',
  'sajdah',
  'text_uthmani',
  'text_uthmani_tajweed',
  'text_indopak',
  'text_imlaei',
  'text_search',
];

const WORD_COLUMNS = ['verse_id', 'position', 'char_type', 'text_uthmani', 'text_imlaei'];

const SEED_SCHEMA_SQL = `
CREATE TABLE meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE chapters (
  id INTEGER PRIMARY KEY,
  name_arabic TEXT NOT NULL,
  name_simple TEXT NOT NULL,
  name_en TEXT NOT NULL,
  revelation_place TEXT NOT NULL,
  revelation_order INTEGER NOT NULL,
  verses_count INTEGER NOT NULL,
  bismillah_pre INTEGER NOT NULL,
  bismillah_text TEXT,
  bismillah_imlaei TEXT,
  page_start INTEGER NOT NULL,
  page_end INTEGER NOT NULL
);

CREATE TABLE verses (
  id INTEGER PRIMARY KEY,
  verse_key TEXT NOT NULL UNIQUE,
  chapter_id INTEGER NOT NULL,
  verse_number INTEGER NOT NULL,
  juz INTEGER NOT NULL,
  hizb INTEGER NOT NULL,
  rub_el_hizb INTEGER NOT NULL,
  page INTEGER NOT NULL,
  sajdah TEXT NOT NULL,
  text_uthmani TEXT NOT NULL,
  text_uthmani_tajweed TEXT,
  text_indopak TEXT,
  text_imlaei TEXT,
  text_search TEXT NOT NULL
);

CREATE TABLE words (
  verse_id INTEGER NOT NULL,
  position INTEGER NOT NULL,
  char_type TEXT NOT NULL,
  text_uthmani TEXT NOT NULL,
  text_imlaei TEXT NOT NULL,
  PRIMARY KEY (verse_id, position)
);

CREATE INDEX words_verse_id_idx ON words (verse_id);
`;

const SOURCE_CREDIT = 'Tanzil Project — tanzil.net (CC BY 3.0)';

const outputPath = resolve(
  process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '../assets/db/tanzil-seed.db'),
);

const verification = verifyTanzil();
if (!verification.ok) {
  console.error(verification.failures.join('\n'));
  process.exit(1);
}

const loaded = loadTanzil();
const tempPath = `${outputPath}.building`;

mkdirSync(dirname(outputPath), { recursive: true });
rmSync(tempPath, { force: true });

try {
  writeSeed(tempPath, loaded);
  renameSync(tempPath, outputPath);
} catch (error) {
  rmSync(tempPath, { force: true });
  throw error;
}

function writeSeed(path, loaded) {
  const suras = [...loaded.metadata.suras].sort((left, right) => left.index - right.index);
  const sajdas = sajdaMap(loaded.metadata.sajdas);
  const bismillah = buildChapterBismillah();
  const wordRows = buildWordMap();
  const wordsByVerse = wordsByVerseId(wordRows);
  const juzCursor = numberedCursor(loaded.metadata.juzs, 'juz');
  const quarterCursor = numberedCursor(loaded.metadata.hizbs, 'quarter');
  const pageCursor = numberedCursor(loaded.metadata.pages, 'page');
  const verses = [];
  let previous = { sura: 0, aya: 0 };

  for (const [index, ayah] of loaded.ayahs.entries()) {
    const simple = loaded.simpleAyahs[index];
    const forward =
      ayah.sura > previous.sura || (ayah.sura === previous.sura && ayah.aya > previous.aya);
    if (!simple || simple.sura !== ayah.sura || simple.aya !== ayah.aya || !forward) {
      throw new Error(`Ayah ${ayah.sura}:${ayah.aya} is out of mushaf order or has no Simple text.`);
    }
    previous = ayah;

    const quarter = valueAt(quarterCursor, ayah.sura, ayah.aya);
    const verseKey = `${ayah.sura}:${ayah.aya}`;
    const uthmani = splitBasmala(ayah.sura, ayah.aya, ayah.text);
    const imlaei = splitBasmala(simple.sura, simple.aya, simple.text);
    const verseWords = wordsByVerse.get(index + 1) ?? [];
    assertRejoins(verseKey, ayah.text, simple.text, uthmani, imlaei, verseWords);
    verses.push({
      id: index + 1,
      verse_key: verseKey,
      chapter_id: ayah.sura,
      verse_number: ayah.aya,
      juz: valueAt(juzCursor, ayah.sura, ayah.aya),
      hizb: Math.ceil(quarter / 4),
      rub_el_hizb: quarter,
      page: valueAt(pageCursor, ayah.sura, ayah.aya),
      sajdah: sajdas.get(verseKey) ?? 'none',
      text_uthmani: uthmani.text,
      text_uthmani_tajweed: null,
      text_indopak: null,
      text_imlaei: imlaei.text,
      text_search: normalizeForSearch(imlaei.text),
    });
  }

  const pageRanges = new Map();
  for (const verse of verses) {
    const range = pageRanges.get(verse.chapter_id) ?? { start: verse.page, end: verse.page };
    range.start = Math.min(range.start, verse.page);
    range.end = Math.max(range.end, verse.page);
    pageRanges.set(verse.chapter_id, range);
  }

  const database = new DatabaseSync(path);
  try {
    database.exec(SEED_SCHEMA_SQL);
    database.exec('BEGIN');
    const insertChapter = database.prepare(insertSql('chapters', CHAPTER_COLUMNS));
    const insertVerse = database.prepare(insertSql('verses', VERSE_COLUMNS));
    const insertWord = database.prepare(insertSql('words', WORD_COLUMNS));
    const insertMeta = database.prepare('INSERT INTO meta (key, value) VALUES (?, ?)');

    for (const sura of suras) {
      const chapterBismillah = bismillah.get(sura.index);
      insertChapter.run(
        ...row(CHAPTER_COLUMNS, {
          id: sura.index,
          name_arabic: sura.name,
          name_simple: sura.tname,
          name_en: sura.ename,
          revelation_place: revelationPlace(sura.type),
          revelation_order: sura.order,
          verses_count: sura.ayas,
          bismillah_pre: sura.index === 1 || sura.index === 9 ? 0 : 1,
          bismillah_text: chapterBismillah?.uthmani ?? null,
          bismillah_imlaei: chapterBismillah?.imlaei ?? null,
          page_start: requiredRange(pageRanges, sura.index).start,
          page_end: requiredRange(pageRanges, sura.index).end,
        }),
      );
    }

    for (const verse of verses) {
      insertVerse.run(...row(VERSE_COLUMNS, verse));
    }

    for (const word of wordRows) {
      insertWord.run(...row(WORD_COLUMNS, word));
    }

    for (const [key, value] of [
      ['seed_schema_version', '1'],
      ['bundled_text', 'tanzil-uthmani-1.1'],
      ['text_checksum', TANZIL_UTHMANI_CHECKSUM],
      ['word_map_version', '1'],
      ['source_credit', SOURCE_CREDIT],
    ]) {
      insertMeta.run(key, value);
    }

    database.exec('COMMIT');
    database.exec('VACUUM');
  } catch (error) {
    try {
      database.exec('ROLLBACK');
    } catch {
      // The statement failed before BEGIN, or SQLite already rolled back.
    }
    throw error;
  } finally {
    database.close();
  }
}

function wordsByVerseId(wordRows) {
  const grouped = new Map();
  for (const word of wordRows) {
    const list = grouped.get(word.verse_id) ?? [];
    list.push(word);
    grouped.set(word.verse_id, list);
  }
  return grouped;
}

function assertRejoins(verseKey, uthmaniSource, simpleSource, uthmani, imlaei, verseWords) {
  const rebuiltUthmani = uthmani.bismillah === null ? uthmani.text : `${uthmani.bismillah} ${uthmani.text}`;
  const rebuiltImlaei = imlaei.bismillah === null ? imlaei.text : `${imlaei.bismillah} ${imlaei.text}`;
  const joinedUthmani = verseWords
    .filter((word) => word.char_type === 'word')
    .map((word) => word.text_uthmani)
    .join(' ');
  const joinedImlaei = verseWords
    .filter((word) => word.char_type === 'word')
    .map((word) => word.text_imlaei)
    .join(' ');
  if (
    rebuiltUthmani !== uthmaniSource ||
    rebuiltImlaei !== simpleSource ||
    joinedUthmani !== uthmani.text ||
    joinedImlaei !== imlaei.text
  ) {
    throw new Error(`Verse ${verseKey} does not rejoin the Tanzil line.`);
  }
}

function sajdaMap(sajdas) {
  const mapped = new Map();
  for (const sajda of sajdas) {
    if (sajda.type !== 'recommended' && sajda.type !== 'obligatory') {
      throw new Error(`Unknown sajda type "${sajda.type}" at ${sajda.sura}:${sajda.aya}.`);
    }
    mapped.set(`${sajda.sura}:${sajda.aya}`, sajda.type);
  }
  return mapped;
}

function numberedCursor(points, label) {
  const numbered = points.map((point, index) => ({ sura: point.sura, aya: point.aya, number: index + 1 }));
  for (let index = 1; index < numbered.length; index += 1) {
    const previous = numbered[index - 1];
    const current = numbered[index];
    const ordered =
      previous.sura < current.sura || (previous.sura === current.sura && previous.aya <= current.aya);
    if (!ordered) {
      throw new Error(`${label} start points are not in mushaf order.`);
    }
  }
  return { points: numbered, next: 0, current: 0 };
}

function valueAt(cursor, sura, aya) {
  while (cursor.next < cursor.points.length) {
    const upcoming = cursor.points[cursor.next];
    const atOrBefore = upcoming.sura < sura || (upcoming.sura === sura && upcoming.aya <= aya);
    if (!atOrBefore) {
      break;
    }
    cursor.current = upcoming.number;
    cursor.next += 1;
  }
  if (cursor.current === 0) {
    throw new Error(`No division start at or before ${sura}:${aya}.`);
  }
  return cursor.current;
}

function revelationPlace(type) {
  if (type === 'Meccan') {
    return 'makkah';
  }
  if (type === 'Medinan') {
    return 'madinah';
  }
  throw new Error(`Unknown revelation type "${type}".`);
}

function requiredRange(pageRanges, chapterId) {
  const range = pageRanges.get(chapterId);
  if (!range) {
    throw new Error(`Sura ${chapterId} has no verses to place on a page.`);
  }
  return range;
}

function insertSql(table, columns) {
  return `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`;
}

function row(columns, values) {
  return columns.map((column) => {
    if (!Object.hasOwn(values, column)) {
      throw new Error(`Missing seed column ${column}.`);
    }
    return values[column];
  });
}
