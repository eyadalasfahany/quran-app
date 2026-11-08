import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Google Play's What's new limit. The App Store allows 4000, so 500 is safe for both.
const MAX_CODE_POINTS = 500;
const STORE_NAMES = /\b(iphone|ipad|ios|android|google play|app store)\b/i;
const ARABIC_STORE_NAMES = /(آيفون|ايفون|آيباد|ايباد|أندرويد|اندرويد)/;
// Alef wasla and Quranic annotation marks: text copied from the Quran.
const QURAN_MARKS = /[\u0671\u06D6-\u06ED]/u;

export function checkReleaseNotes({ appVersion, tagVersion, notes }) {
  const failures = [];

  if (tagVersion !== appVersion) {
    failures.push(`Tag mobile-v${tagVersion} does not match app.config.ts version ${appVersion}.`);
  }

  for (const lang of ['ar', 'en']) {
    const text = notes[lang];
    const path = `infra/store-release/release-notes/${appVersion}/${lang}.txt`;

    if (text === null) {
      failures.push(`Missing ${path}.`);
      continue;
    }

    const trimmed = text.trim();
    if (trimmed === '') {
      failures.push(`${path} is empty.`);
      continue;
    }

    if ([...trimmed].length > MAX_CODE_POINTS) {
      failures.push(`${path} is ${[...trimmed].length} characters; the limit is ${MAX_CODE_POINTS}.`);
    }

    if (STORE_NAMES.test(trimmed) || ARABIC_STORE_NAMES.test(trimmed)) {
      failures.push(`${path} names a platform or store. Each store rejects the other's names; say what changed instead.`);
    }

    if (QURAN_MARKS.test(trimmed)) {
      failures.push(`${path} contains Quran script. Release notes must not quote Quran text (App Store Connect rejected Uthmani script, see docs/runbooks/store-listing.md).`);
    }
  }

  return failures;
}

function readNotes(appVersion) {
  const notes = {};
  for (const lang of ['ar', 'en']) {
    const url = new URL(`../../infra/store-release/release-notes/${appVersion}/${lang}.txt`, import.meta.url);
    try {
      notes[lang] = readFileSync(fileURLToPath(url), 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      notes[lang] = null;
    }
  }
  return notes;
}

function main() {
  const [appVersion, tagVersion] = process.argv.slice(2);
  if (!appVersion || !tagVersion) {
    console.error('Usage: node .github/scripts/release-notes-check.mjs <appVersion> <tagVersion>');
    process.exit(2);
  }

  const failures = checkReleaseNotes({ appVersion, tagVersion, notes: readNotes(appVersion) });

  for (const line of failures) console.error(line);
  if (failures.length > 0) process.exit(1);
  console.log(`Release notes OK for ${appVersion}.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
