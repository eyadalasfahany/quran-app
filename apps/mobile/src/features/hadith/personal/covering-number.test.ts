import { FIXTURE_MULTI } from '../data/__fixtures__/dev-fixtures';
import { listBooks } from '../data';
import { canonicalHadithNumber, resolveCoveringNumber } from './covering-number';
import { addEntry, mergeResolver, openPersonalDbs, type PersonalDbs } from './__fixtures__/personal-test-db';
import { at } from '../../../../jest/azkar-test-db';

const slug = FIXTURE_MULTI.slug;

describe('canonicalHadithNumber', () => {
  let dbs: PersonalDbs;

  beforeEach(() => {
    dbs = openPersonalDbs();
    const book = at(
      listBooks(dbs.content, slug).filter((item) => item.bookNumber === '2'),
      0,
    );
    addEntry(dbs.content, { resourceId: FIXTURE_MULTI.resourceId, id: 9001, bookId: book.id, hadithNumber: '5709', position: 90 });
    addEntry(dbs.content, { resourceId: FIXTURE_MULTI.resourceId, id: 9002, bookId: book.id, hadithNumber: '5711', position: 91 });
  });

  afterEach(() => {
    dbs.close();
  });

  it('returns the number unchanged when it exists as a hadith', () => {
    expect(canonicalHadithNumber(dbs.content, slug, '3.1')).toBe('3.1');
  });

  it('returns the number unchanged when the collection is not installed', () => {
    expect(canonicalHadithNumber(dbs.content, 'not-installed', '5710', mergeResolver({ '5710': '5709' }))).toBe('5710');
  });

  it('returns the number unchanged when no content database is given', () => {
    expect(canonicalHadithNumber(undefined, slug, '5710', mergeResolver({ '5710': '5709' }))).toBe('5710');
  });

  it('uses the resolver only when the number is not a hadith of its own', () => {
    const resolver = jest.fn(() => '1');

    expect(canonicalHadithNumber(dbs.content, slug, '1', resolver)).toBe('1');
    expect(resolver).not.toHaveBeenCalled();

    canonicalHadithNumber(dbs.content, slug, '5710', resolver);
    expect(resolver).toHaveBeenCalledTimes(1);
  });

  it('resolves a merged number to the covering hadith', () => {
    expect(canonicalHadithNumber(dbs.content, slug, '5710', mergeResolver({ '5710': '5709' }))).toBe('5709');
  });

  it('ignores a resolver result that is not a hadith in the pack', () => {
    expect(canonicalHadithNumber(dbs.content, slug, '5710', mergeResolver({ '5710': '9999' }))).toBe('5710');
  });

  it('ignores a resolver that throws', () => {
    const throwing = () => {
      throw new Error('resolver failed');
    };
    expect(canonicalHadithNumber(dbs.content, slug, '5710', throwing)).toBe('5710');
  });

  it('the default resolver merges nothing', () => {
    expect(resolveCoveringNumber(dbs.content, slug, '5710')).toBeNull();
  });
});
