import { splitBasmala } from './basmala.ts';
import { loadTanzil, type Ayah } from './tanzil.ts';
import { alignImlaei, splitUthmaniWords, WordSplitError, type CharType } from './words.ts';

export type WordMapRow = {
  verse_id: number;
  verse_key: string;
  position: number;
  char_type: CharType;
  text_uthmani: string;
  text_imlaei: string;
};

export type ChapterBismillah = {
  uthmani: string;
  imlaei: string;
};

export function buildWordMap(): WordMapRow[] {
  const collected = collectWordMap();

  if (collected.failures.length > 0) {
    throw new WordSplitError(collected.failures.join('\n'));
  }

  return collected.rows;
}

export function collectWordMap(): { rows: WordMapRow[]; failures: string[] } {
  const loaded = loadTanzil();
  const rows: WordMapRow[] = [];
  const failures: string[] = [];

  loaded.ayahs.forEach((ayah, index) => {
    const simple = loaded.simpleAyahs[index];
    const verseKey = `${ayah.sura}:${ayah.aya}`;

    if (simple === undefined || simple.sura !== ayah.sura || simple.aya !== ayah.aya) {
      failures.push(`${verseKey} has no matching Simple verse.`);
      return;
    }

    try {
      rows.push(...verseRows(index + 1, verseKey, ayah, simple));
    } catch (error) {
      failures.push(error instanceof Error ? error.message : `${verseKey} could not be aligned.`);
    }
  });

  return { rows, failures };
}

export function buildChapterBismillah(): Map<number, ChapterBismillah> {
  const loaded = loadTanzil();
  const uthmani = bismillahByChapter(loaded.ayahs);
  const imlaei = bismillahByChapter(loaded.simpleAyahs);
  const chapters = new Map<number, ChapterBismillah>();

  if (uthmani.size !== imlaei.size) {
    throw new WordSplitError(
      `Uthmani splits the Basmala in ${uthmani.size} surahs and Simple in ${imlaei.size}.`,
    );
  }

  for (const [chapterId, uthmaniText] of uthmani) {
    const imlaeiText = imlaei.get(chapterId);

    if (imlaeiText === undefined) {
      throw new WordSplitError(`Surah ${chapterId} splits the Uthmani Basmala and not the Simple one.`);
    }

    chapters.set(chapterId, { uthmani: uthmaniText, imlaei: imlaeiText });
  }

  return chapters;
}

function verseRows(verseId: number, verseKey: string, uthmani: Ayah, simple: Ayah): WordMapRow[] {
  const uthmaniSplit = splitBasmala(uthmani.sura, uthmani.aya, uthmani.text);
  const simpleSplit = splitBasmala(simple.sura, simple.aya, simple.text);
  const uthmaniWords = splitUthmaniWords(verseKey, uthmaniSplit.text);
  const imlaeiWords = alignImlaei(uthmaniWords, simpleSplit.text, verseKey);

  return uthmaniWords.map((word, index) => {
    const imlaei = imlaeiWords[index];

    if (imlaei === undefined || imlaei.position !== word.position || imlaei.char_type !== word.char_type) {
      throw new WordSplitError(`Imla'i alignment for ${verseKey} does not match Uthmani position ${word.position}.`);
    }

    return {
      verse_id: verseId,
      verse_key: verseKey,
      position: word.position,
      char_type: word.char_type,
      text_uthmani: word.text,
      text_imlaei: imlaei.text_imlaei,
    };
  });
}

function bismillahByChapter(ayahs: readonly Ayah[]): Map<number, string> {
  const chapters = new Map<number, string>();

  for (const ayah of ayahs) {
    const split = splitBasmala(ayah.sura, ayah.aya, ayah.text);

    if (split.bismillah === null) {
      continue;
    }

    if (chapters.has(ayah.sura)) {
      throw new WordSplitError(`Surah ${ayah.sura} has more than one Basmala split.`);
    }

    chapters.set(ayah.sura, split.bismillah);
  }

  return chapters;
}
