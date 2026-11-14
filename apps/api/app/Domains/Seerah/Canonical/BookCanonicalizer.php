<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Canonical;

use App\Domains\Seerah\Exceptions\SeerahCanonicalException;

/**
 * The canonical text of the pinned book (ADR 0089 §3, Phase 8 step 3). Pure: it takes the bytes of the source and the configured
 * front-matter titles, and returns the book. It reads no file, no config and no database, so its tests run without MySQL.
 */
final class BookCanonicalizer
{
    private const string HEADER_END = '#META#Header#End#';

    /**
     * @param  list<string>  $frontTitles  the exact titles of the front-matter headings, in book order
     *
     * @throws SeerahCanonicalException with a code in the message: encoding, line_endings, header_missing, unparsed lines,
     *                                  front_mismatch, no_headings, tab_in_text
     */
    public function canonicalize(string $raw, array $frontTitles = []): CanonicalBook
    {
        if (! mb_check_encoding($raw, 'UTF-8')) {
            throw new SeerahCanonicalException('The source is not valid UTF-8 (encoding).');
        }

        if (str_contains($raw, "\r")) {
            throw new SeerahCanonicalException('The source has carriage returns (line_endings); only LF is accepted.');
        }

        $lines = explode("\n", $raw);
        $headerEnd = $this->headerEnd($lines);
        $counts = new CanonicalCounts;
        $counts->headerLines = $headerEnd + 1;
        $unparsed = new UnparsedLines;

        $blocks = (new SourceBlockReader)->read($lines, $headerEnd, $counts, $unparsed);

        return (new BookAssembler($counts, $unparsed, $frontTitles))->assemble($blocks);
    }

    /**
     * @param  list<string>  $lines
     *
     * @throws SeerahCanonicalException when the header end line is absent
     */
    private function headerEnd(array $lines): int
    {
        foreach ($lines as $index => $line) {
            if ($line === self::HEADER_END) {
                return $index;
            }
        }

        throw new SeerahCanonicalException('The source has no header end line (header_missing).');
    }
}
