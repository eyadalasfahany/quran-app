import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { goldenBlob, tqpBlobFor } from './__fixtures__/tqp/blob';
import { absoluteCommands, splitSubpaths } from './tqp-subpaths';
import { decodeTqp, TqpDecodeError } from './tqp-decoder';

// The reference ints (tqp.py): for every command, its absolute points in grid units (the fixture is not artwork).
const ints = (name: string): [number, number[]][] =>
  (JSON.parse(readFileSync(join(__dirname, '__fixtures__/tqp', `${name}.ints.json`), 'utf8')) as [number, number[][]][]).map(
    ([code, points]) => [code, points.flat()],
  );

describe.each(['basic', 'escape'])('absolute walk of the %s golden page', (name) => {
  it('gives every command its reference points', () => {
    const decoded = decodeTqp(goldenBlob(name));
    const table = splitSubpaths(decoded);
    const walked = absoluteCommands(decoded, table, 0, table.count).map(({ code, points }) => [code, points]);
    const expected = ints(name);
    expect(walked).toEqual(expected);
  });

  it('starts one subpath per move', () => {
    const decoded = decodeTqp(goldenBlob(name));
    const table = splitSubpaths(decoded);
    const moves = ints(name).filter(([code]) => code === 0);
    expect(table.count).toBe(moves.length);
    moves.forEach(([, points], index) => {
      expect([table.starts[2 * index], table.starts[2 * index + 1]]).toEqual(points);
    });
  });
});

describe('splitSubpaths on synthetic pages (FIXTURE — not artwork)', () => {
  it('splits a page into runs of commands from each move', () => {
    // M(10,10) L(+5,0) Z | M(+2,+2) L(+1,+1)
    const decoded = decodeTqp(tqpBlobFor([0, 1, 4, 0, 1], [10, 10, 5, 0, 2, 2, 1, 1]));
    const table = splitSubpaths(decoded);
    expect(table.count).toBe(2);
    expect(Array.from(table.cmdFrom)).toEqual([0, 3, 5]);
    expect(Array.from(table.deltaFrom)).toEqual([0, 4, 8]);
    expect(Array.from(table.starts)).toEqual([10, 10, 12, 12]);
  });

  it('takes a move after Z relative to the subpath start', () => {
    // M(10,10) L(+20,+0) L(+0,+20) Z, then M(+1,+1): the start is (10,10), so the new move is (11,11)
    const decoded = decodeTqp(tqpBlobFor([0, 1, 1, 4, 0], [10, 10, 20, 0, 0, 20, 1, 1]));
    const table = splitSubpaths(decoded);
    expect(Array.from(table.starts)).toEqual([10, 10, 11, 11]);
  });

  it('takes a curve end relative to the command start', () => {
    // M(0,0) C with control (+1,+1), (+2,+2) and end (+4,+0): the next line starts at (4,0)
    const decoded = decodeTqp(tqpBlobFor([0, 3, 1], [0, 0, 1, 1, 2, 2, 4, 0, 1, 0]));
    const walked = absoluteCommands(decoded, splitSubpaths(decoded), 0, 1);
    expect(walked[1]).toEqual({ code: 3, points: [1, 1, 2, 2, 4, 0] });
    expect(walked[2]).toEqual({ code: 1, points: [5, 0] });
  });

  it('refuses a page that does not start with a move', () => {
    const decoded = decodeTqp(tqpBlobFor([1], [1, 1]));
    expect(() => splitSubpaths(decoded)).toThrow(TqpDecodeError);
  });

  it('keeps an empty page empty', () => {
    const table = splitSubpaths(decodeTqp(tqpBlobFor([], [])));
    expect(table.count).toBe(0);
    expect(Array.from(table.cmdFrom)).toEqual([0]);
  });
});
