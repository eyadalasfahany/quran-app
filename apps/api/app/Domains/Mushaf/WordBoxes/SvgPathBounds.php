<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\WordBoxes;

use App\Domains\Mushaf\Exceptions\SvgMushafSourceException;

/**
 * Splits SVG path data into subpaths and gives each one's bounding box from its endpoints and control points, in the path's own
 * coordinates and path order (ADR 0090, a port of the spike's `words2.py`). Control points are only those written in the data,
 * as in the spike; the reflected control point of `s` and `t` is not added.
 *
 * @phpstan-type Box array{0: float, 1: float, 2: float, 3: float}
 */
final class SvgPathBounds
{
    private const string TOKEN = '/[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/';

    /** Arguments per command; an `m` with more pairs continues as `l`. */
    private const array ARGS = ['m' => 2, 'l' => 2, 'h' => 1, 'v' => 1, 'c' => 6, 's' => 4, 'q' => 4, 't' => 2, 'a' => 7, 'z' => 0];

    /**
     * @return list<Box> One box per drawn subpath. A moveto that draws nothing is not a contour.
     *
     * @throws SvgMushafSourceException
     */
    public static function contours(string $d): array
    {
        preg_match_all(self::TOKEN, $d, $matches);
        $tokens = $matches[0];
        $count = count($tokens);

        $boxes = [];
        $cmd = null;
        $x = $y = $sx = $sy = 0.0;
        $box = null; // the open subpath's [x0, y0, x1, y1]
        $drawn = false;
        $i = 0;

        while ($i < $count) {
            $token = $tokens[$i];
            $lower = strtolower($token);

            if (isset(self::ARGS[$lower])) {
                $cmd = $token;
                $i++;

                if ($lower === 'z') {
                    if ($box !== null && $drawn) {
                        $boxes[] = $box;
                    }

                    $x = $sx;
                    $y = $sy;
                    $box = null;
                    $drawn = false;

                    continue;
                }
            } elseif ($cmd === null || strtolower($cmd) === 'z') {
                throw new SvgMushafSourceException('Path data has a number with no command before it.');
            }

            $c = strtolower((string) $cmd);
            $relative = $cmd !== strtoupper((string) $cmd);
            $n = self::ARGS[$c];

            // Arc flags may be packed, so an arc can use fewer tokens than arguments; arcArgs checks its own end.
            if ($c !== 'a' && $i + $n > $count) {
                throw new SvgMushafSourceException('Path data ends inside a ['.$cmd.'] command.');
            }

            if ($c === 'a') {
                $args = self::arcArgs($tokens, $i, $count);
            } else {
                $args = [];

                for ($k = 0; $k < $n; $k++) {
                    $args[] = (float) $tokens[$i + $k];
                }

                $i += $n;
            }

            if ($c === 'm') {
                if ($box !== null && $drawn) {
                    $boxes[] = $box;
                }

                $x = $relative ? $x + $args[0] : $args[0];
                $y = $relative ? $y + $args[1] : $args[1];
                $sx = $x;
                $sy = $y;
                $box = [$x, $y, $x, $y];
                $drawn = false;
                $cmd = $relative ? 'l' : 'L';

                continue;
            }

            // A drawing command after `z` starts a new subpath at the current point.
            $box ??= [$x, $y, $x, $y];
            $drawn = true;

            if ($c === 'h') {
                $x = $relative ? $x + $args[0] : $args[0];
            } elseif ($c === 'v') {
                $y = $relative ? $y + $args[0] : $args[0];
            } elseif ($c === 'a') {
                $x = $relative ? $x + $args[5] : $args[5];
                $y = $relative ? $y + $args[6] : $args[6];
            } else {
                $px = $x;
                $py = $y;

                for ($k = 0; $k < $n; $k += 2) {
                    $px = $relative ? $x + $args[$k] : $args[$k];
                    $py = $relative ? $y + $args[$k + 1] : $args[$k + 1];
                    $box = self::extend($box, $px, $py);
                }

                $x = $px;
                $y = $py;

                continue;
            }

            $box = self::extend($box, $x, $y);
        }

        if ($box !== null && $drawn) {
            $boxes[] = $box;
        }

        return $boxes;
    }

    /**
     * Reads the seven arc arguments. Each flag is one character, so `011` is two flags and a number, as SVG allows.
     *
     * @param  list<string>  $tokens
     * @return list<float>
     *
     * @throws SvgMushafSourceException
     */
    private static function arcArgs(array &$tokens, int &$i, int $count): array
    {
        $args = [];

        for ($k = 0; $k < 7; $k++) {
            if ($i >= $count) {
                throw new SvgMushafSourceException('Path data ends inside an arc.');
            }

            $token = $tokens[$i];

            if (($k === 3 || $k === 4) && strlen($token) > 1 && ($token[0] === '0' || $token[0] === '1')) {
                $args[] = (float) $token[0];
                $tokens[$i] = substr($token, 1);

                continue;
            }

            $args[] = (float) $token;
            $i++;
        }

        return $args;
    }

    /**
     * @param  Box  $box
     * @return Box
     */
    private static function extend(array $box, float $x, float $y): array
    {
        return [min($box[0], $x), min($box[1], $y), max($box[2], $x), max($box[3], $y)];
    }
}
