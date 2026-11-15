import { storage } from './mmkv';
import { createRecentQueries } from './recent-queries';

const KEY = 'test.recentQueries';
const MAX = 3;

describe('createRecentQueries', () => {
  beforeEach(() => {
    storage.remove(KEY);
  });

  it('keeps the newest query first, without repeats or blanks', () => {
    const history = createRecentQueries(KEY, MAX);

    history.add('alpha');
    history.add('beta');
    expect(history.add('  alpha  ')).toEqual(['alpha', 'beta']);
    expect(history.add('   ')).toEqual(['alpha', 'beta']);
  });

  it('caps the history at the maximum, dropping the oldest', () => {
    const history = createRecentQueries(KEY, MAX);

    for (const query of ['one', 'two', 'three', 'four']) {
      history.add(query);
    }
    expect(history.read()).toEqual(['four', 'three', 'two']);
  });

  it('removes one query and clears all', () => {
    const history = createRecentQueries(KEY, MAX);
    history.add('one');
    history.add('two');

    expect(history.remove('one')).toEqual(['two']);
    expect(history.clear()).toEqual([]);
    expect(history.read()).toEqual([]);
  });

  it('keeps each key apart', () => {
    const first = createRecentQueries(KEY, MAX);
    const second = createRecentQueries(`${KEY}.other`, MAX);

    first.add('only here');
    expect(second.read()).toEqual([]);
    second.clear();
    first.clear();
  });

  it('reads nothing from a stored value that is not a list of queries', () => {
    const history = createRecentQueries(KEY, MAX);

    storage.set(KEY, '{not json');
    expect(history.read()).toEqual([]);

    storage.set(KEY, JSON.stringify({ queries: ['x'] }));
    expect(history.read()).toEqual([]);

    storage.set(KEY, JSON.stringify(['keep', 7, '  ', null]));
    expect(history.read()).toEqual(['keep']);
  });
});
