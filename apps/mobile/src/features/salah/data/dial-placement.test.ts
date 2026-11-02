import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { dialAnchor, dialPlacement, dialTranslateX } from './dial-placement';

const FACE = 336;

/** Where React Native draws a box placed by dialPlacement: `left` is swapped in RTL, so its anchor is the right edge. */
function physicalLeft(style: ReturnType<typeof dialPlacement>, container: number, isRTL: boolean): number {
  const translateX = style.transform.find((t): t is { translateX: number } => 'translateX' in t)?.translateX ?? 0;
  return (isRTL ? container - style.width - style.left : style.left) + translateX;
}

describe('dialTranslateX', () => {
  it('is the physical left in LTR, where the anchor is the left edge', () => {
    expect(dialTranslateX(280, FACE, 40, false)).toBe(280);
  });

  it('measures back from the right anchor in RTL: x − (container − box)', () => {
    expect(dialTranslateX(280, FACE, 40, true)).toBe(280 - (336 - 40));
  });
});

describe('dialPlacement', () => {
  it.each([false, true])('lands the box at its physical left, in RTL %s', (isRTL) => {
    const style = dialPlacement(224, 71, 40, 14, isRTL);

    expect(physicalLeft(style, FACE, isRTL)).toBeCloseTo(224, 5);
  });

  it('never uses a left offset: the anchor is always 0 so RTL cannot mirror the box', () => {
    expect(dialPlacement(224, 71, 40, 14, true).left).toBe(0);
    expect(dialPlacement(224, 71, 40, 14, false).left).toBe(0);
  });

  it('places the box top with a translateY, unchanged by direction', () => {
    const style = dialPlacement(0, 60, 10, 10, true);

    expect(style.transform).toContainEqual({ translateY: 60 });
    expect(style.top).toBe(0);
  });

  it('uses the given container width when the box sits in a wider or narrower box (the scaled instrument)', () => {
    const style = dialPlacement(50, 0, 336, 336, true, 436);

    expect(physicalLeft(style, 436, true)).toBeCloseTo(50, 5);
  });
});

describe('dialAnchor', () => {
  it('fills its container at zero offset, with no direction-dependent offset', () => {
    expect(dialAnchor(336, 336)).toEqual({ height: 336, left: 0, position: 'absolute', top: 0, width: 336 });
  });
});

describe('no physical offsets in the salah dial', () => {
  // A `left:` or `right:` style key is swapped by React Native in RTL. Only the `left: 0` anchor is allowed.
  const offsetKey = /(?<![\w$.])(left|right)\s*:\s*([^,}\n]+)/g;

  function sourceFiles(relativeDir: string): string[] {
    const dir = join(process.cwd(), relativeDir);
    return readdirSync(dir)
      .filter((name) => name.endsWith('.tsx') && !name.endsWith('.test.tsx'))
      .map((name) => join(dir, name));
  }

  function offendingOffsets(file: string): string[] {
    const offences: string[] = [];
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, index) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) {
          return;
        }
        for (const match of line.matchAll(offsetKey)) {
          if (match[2]?.trim() !== '0') {
            offences.push(`${file}:${index + 1}: ${match[0].trim()}`);
          }
        }
      });
    return offences;
  }

  it.each(['src/features/salah/components', 'src/features/salah/screens'])(
    'has no absolute left/right offsets in %s (use dialPlacement or a translate)',
    (dir) => {
      const offences = sourceFiles(dir).flatMap(offendingOffsets);

      expect(offences).toEqual([]);
    },
  );
});
