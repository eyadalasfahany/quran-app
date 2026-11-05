import { duaHadithShareText, duaQuranShareText } from './share-text';

const VERSE_1 = 'FIXTURE VERSE 1 — not a dua';
const VERSE_2 = 'FIXTURE VERSE 2 — not a dua';
const SOURCE = 'FIXTURE source — not a dua';

const HADITH = {
  hadeeth: 'FIXTURE text 1 — not a dua',
  attribution: 'FIXTURE attribution — not a dua',
  credit: 'FIXTURE credit · 1',
  url: 'https://example.test/hadith/1',
};

describe('duaQuranShareText', () => {
  it('wraps the verses in ﴿ ﴾, then a blank line and the source', () => {
    expect(duaQuranShareText([VERSE_1], SOURCE)).toBe(`﴿${VERSE_1}﴾\n\n${SOURCE}`);
  });

  it('joins several verses with one space and nothing else', () => {
    expect(duaQuranShareText([VERSE_1, VERSE_2], SOURCE)).toBe(`﴿${VERSE_1} ${VERSE_2}﴾\n\n${SOURCE}`);
  });
});

describe('duaHadithShareText', () => {
  it('is the text, a blank line, then attribution, credit and url on their own lines', () => {
    expect(duaHadithShareText(HADITH)).toBe(
      `${HADITH.hadeeth}\n\n${HADITH.attribution}\n${HADITH.credit}\n${HADITH.url}`,
    );
  });

  it('skips a blank attribution', () => {
    expect(duaHadithShareText({ ...HADITH, attribution: '   ' })).toBe(`${HADITH.hadeeth}\n\n${HADITH.credit}\n${HADITH.url}`);
  });

  it('keeps the text byte-for-byte', () => {
    const text = `  ${HADITH.hadeeth}  `;
    expect(duaHadithShareText({ ...HADITH, hadeeth: text }).startsWith(`${text}\n\n`)).toBe(true);
  });
});
