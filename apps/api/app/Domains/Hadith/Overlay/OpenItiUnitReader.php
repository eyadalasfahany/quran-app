<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Overlay;

use App\Domains\Hadith\Exceptions\HadithDataFileException;

/**
 * Splits an OpenITI mARkdown file into numbered units, exactly as the gap measurement did (ADR 0076 §8.3, step 6b.6). Pure:
 * it reads a path given by the caller and returns units; the index of a unit in the list is its openiti_unit.
 */
final class OpenItiUnitReader
{
    private const string HEADER_END = '#META#Header#End#';

    /**
     * The lines after the header end marker (the whole file when the marker is absent), with a trailing CR removed.
     *
     * @return list<string>
     */
    public function bodyLines(string $bytes): array
    {
        $headerEnd = strpos($bytes, self::HEADER_END);
        $body = $headerEnd === false ? $bytes : substr($bytes, $headerEnd + strlen(self::HEADER_END));
        $lines = [];

        foreach (explode("\n", $body) as $raw) {
            $lines[] = str_ends_with($raw, "\r") ? substr($raw, 0, -1) : $raw;
        }

        return $lines;
    }

    /**
     * @return list<OpenItiUnit>
     *
     * @throws HadithDataFileException when the file cannot be read or a pattern is not a valid regular expression
     */
    public function units(string $path, string $startRx, string $stopRx): array
    {
        $bytes = is_file($path) ? file_get_contents($path) : false;

        if ($bytes === false) {
            throw new HadithDataFileException('The OpenITI file cannot be read (openiti_file_missing).');
        }

        return $this->unitsOf($bytes, $startRx, $stopRx);
    }

    /**
     * The units of file bytes already read (the same rules as units()).
     *
     * @return list<OpenItiUnit>
     */
    public function unitsOf(string $bytes, string $startRx, string $stopRx): array
    {
        $starts = [];
        $linesByUnit = [];
        $open = null;

        foreach ($this->bodyLines($bytes) as $index => $line) {
            if (preg_match($startRx, $line, $match, PREG_OFFSET_CAPTURE) === 1) {
                $starts[] = [
                    'number' => isset($match[1]) && $match[1][0] !== '' ? (int) $match[1][0] : null,
                    'markerEnd' => $match[0][1] + strlen($match[0][0]),
                    'lineIndex' => $index,
                ];
                $open = count($starts) - 1;
                $linesByUnit[$open] = [$line];

                continue;
            }

            if (preg_match($stopRx, $line) === 1) {
                $open = null;

                continue;
            }

            if ($open !== null) {
                $linesByUnit[$open][] = $line;
            }
        }

        $units = [];

        foreach ($starts as $position => $start) {
            $units[] = new OpenItiUnit($start['number'], $linesByUnit[$position], $start['markerEnd'], $start['lineIndex'], $position);
        }

        return $units;
    }
}
