<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Canonical;

/**
 * Reads the lines after the header into blocks. A block starts at a paragraph marker (`# `, or a bare `#`) or at a heading
 * wrapper (`# | `). A continuation (`~~`) and a printed-line marker (`# NNNN ;`) join the block above them; a blank line ends it.
 * Every other line is recorded as unparsed. It never changes text: it only sorts lines.
 */
final class SourceBlockReader
{
    private const string PRINTED_LINE = '~^# \d+ ;(?: |$)~u';

    /**
     * @param  list<string>  $lines
     * @return list<SourceBlock>
     */
    public function read(array $lines, int $headerEnd, CanonicalCounts $counts, UnparsedLines $unparsed): array
    {
        $blocks = [];
        $open = null;

        for ($index = $headerEnd + 1, $total = count($lines); $index < $total; $index++) {
            $line = $lines[$index];
            $number = $index + 1;

            if ($line === '') {
                $counts->blankLines++;
                $open = null;

                continue;
            }

            if (str_starts_with($line, '# |') && ! str_starts_with($line, '# | ')) {
                $unparsed->add($number, 'heading_markup');
                $open = null;

                continue;
            }

            if (str_starts_with($line, '# | ')) {
                $blocks[] = new SourceBlock(true, [new SourceLine($number, substr($line, 4))]);
                $open = array_key_last($blocks);

                continue;
            }

            if (preg_match(self::PRINTED_LINE, $line) === 1) {
                $counts->printedLineMarkers++;
                $this->join($blocks, $open, new SourceLine($number, substr($line, 2)), $unparsed);

                continue;
            }

            if (str_starts_with($line, '~~')) {
                $counts->continuationLines++;
                $this->join($blocks, $open, new SourceLine($number, substr($line, 2)), $unparsed);

                continue;
            }

            if ($line === '#' || str_starts_with($line, '# ')) {
                if ($line === '#') {
                    $counts->bareMarkers++;
                } else {
                    $counts->paragraphMarkers++;
                }

                $blocks[] = new SourceBlock(false, [new SourceLine($number, $line === '#' ? '' : substr($line, 2))]);
                $open = array_key_last($blocks);

                continue;
            }

            $unparsed->add($number, 'unknown_markup');
            $open = null;
        }

        return $blocks;
    }

    /**
     * @param  list<SourceBlock>  $blocks
     */
    private function join(array &$blocks, ?int $open, SourceLine $line, UnparsedLines $unparsed): void
    {
        if ($open === null) {
            $unparsed->add($line->number, 'continuation_without_block');

            return;
        }

        $blocks[$open]->lines[] = $line;
    }
}
