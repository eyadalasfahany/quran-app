<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Canonical;

use App\Domains\Seerah\Enums\BlockKind;

/**
 * Reads the lines after the header into blocks (Shamela edition, ADR 0089 step 3). A block starts at a heading wrapper
 * (`### | `), a paragraph marker (`# ` or a bare `#`) or an editor's footnote body (`# «N»`). A continuation (`~~`) joins the
 * block above it; a blank line ends it. Any other line is recorded as unparsed. It never changes text: it only sorts lines.
 */
final class SourceBlockReader
{
    private const string FOOTNOTE_START = '~^# «\d+»~u';

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

            if (str_starts_with($line, '~~')) {
                $this->join($blocks, $open, new SourceLine($number, substr($line, 2)), $counts, $unparsed);

                continue;
            }

            if (str_starts_with($line, '### | ') || $line === '### |') {
                $blocks[] = new SourceBlock(BlockKind::Heading, [new SourceLine($number, substr($line, 6))]);
                $open = array_key_last($blocks);

                continue;
            }

            if (str_starts_with($line, '###')) {
                $unparsed->add($number, 'heading_markup');
                $open = null;

                continue;
            }

            if (preg_match(self::FOOTNOTE_START, $line) === 1) {
                $counts->footnoteBlocks++;
                $counts->footnoteLines++;
                $blocks[] = new SourceBlock(BlockKind::Footnote, [new SourceLine($number, substr($line, 2))]);
                $open = array_key_last($blocks);

                continue;
            }

            if ($line === '#') {
                $counts->bareMarkers++;
                $blocks[] = new SourceBlock(BlockKind::Paragraph, [new SourceLine($number, '')]);
                $open = array_key_last($blocks);

                continue;
            }

            if (str_starts_with($line, '# ')) {
                $counts->paragraphMarkers++;
                $blocks[] = new SourceBlock(BlockKind::Paragraph, [new SourceLine($number, substr($line, 2))]);
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
    private function join(array &$blocks, ?int $open, SourceLine $line, CanonicalCounts $counts, UnparsedLines $unparsed): void
    {
        if ($open === null) {
            $unparsed->add($line->number, 'continuation_without_block');

            return;
        }

        $counts->continuationLines++;

        if ($blocks[$open]->kind === BlockKind::Footnote) {
            $counts->footnoteLines++;
        }

        $blocks[$open]->lines[] = $line;
    }
}
