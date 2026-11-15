import { writeFileSync } from 'node:fs';

import { apiWordMapPath, committedApiWordMap, renderApiWordMap } from './word-map-json.ts';

// `node src/word-map-json-cli.ts` writes apps/api/resources/quran/word-map.json; `--check` only compares it.
const rendered = renderApiWordMap();

if (process.argv.includes('--check')) {
  if (committedApiWordMap() !== rendered) {
    process.stderr.write(`${apiWordMapPath()} is out of date. Run npm run word-map:api.\n`);
    process.exitCode = 1;
  }
} else {
  writeFileSync(apiWordMapPath(), rendered);
  process.stdout.write(`wrote ${apiWordMapPath()}\n`);
}
