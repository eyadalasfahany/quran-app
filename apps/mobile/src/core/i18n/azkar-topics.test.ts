import { readFileSync } from 'fs';
import { join } from 'path';

import ar from '@/core/i18n/locales/ar.json';
import en from '@/core/i18n/locales/en.json';

/*
 * ADR 0092 (topic names approved by the developer, 15 Nov 2026): every topic id of config azkar_topics.php has an Arabic
 * and an English name under azkar.categories. The config is read here so that a topic added to it later fails this test
 * until its names are added. The old tag keys stay, because packs built before ADR 0092 still use them.
 */

const configPath = join(__dirname, '../../../../api/config/azkar_topics.php');
const source = readFileSync(configPath, 'utf8');
const topicsBlock = source.slice(source.indexOf("'topics'"), source.indexOf("'chapters'"));

const topics = [...topicsBlock.matchAll(/'([a-z0-9-]+)' => \['ar' => '([^']*)', 'en' => '([^']*)'\]/g)].map((match) => ({
  id: match[1] ?? '',
  ar: match[2] ?? '',
  en: match[3] ?? '',
}));

const arNames = ar.azkar.categories as Record<string, string>;
const enNames = en.azkar.categories as Record<string, string>;

describe('azkar topic names', () => {
  it('reads the topic list of config azkar_topics.php', () => {
    expect(topics.length).toBeGreaterThan(0);
  });

  it.each(topics)('gives topic $id its Arabic and English names', ({ id, ar: arabic, en: english }) => {
    expect(arNames[id]).toBe(arabic);
    expect(enNames[id]).toBe(english);
  });

  it('keeps the old tag keys that packs built before ADR 0092 still use', () => {
    for (const key of ['morning-and-evening', 'prayer-and-the-masjid', 'knowledge-and-guidance', 'wudu-and-purification']) {
      expect(arNames[key]).toEqual(expect.any(String));
      expect(enNames[key]).toEqual(expect.any(String));
    }
  });
});
