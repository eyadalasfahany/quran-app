<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Canonical;

/**
 * What the canonicalizer removed, kept and found. Filled once per run; counts only, never text.
 */
final class CanonicalCounts
{
    public int $headerLines = 0;

    public int $blankLines = 0;

    public int $pageMarkers = 0;

    public ?int $firstPage = null;

    public ?int $lastPage = null;

    public int $milestoneTokens = 0;

    public int $continuationLines = 0;

    public int $paragraphMarkers = 0;

    public int $bareMarkers = 0;

    /** Printed-line markers `# NNNN ;`: kept as text (not in the closed list), counted for the developer's decision. */
    public int $printedLineMarkers = 0;

    /** Paragraphs that had no text after the removals (a bare marker or a page marker alone). Not kept. */
    public int $emptyParagraphs = 0;

    /** Pipes `|` kept inside the canonical text (block-closing and internal separators, not in the closed list). */
    public int $pipes = 0;

    /** Complete `{…}` runs found inside one paragraph or heading. */
    public int $bracedRuns = 0;

    /** Paragraphs or headings whose `{` and `}` counts differ. */
    public int $bracedUnbalanced = 0;

    /**
     * @return array<string, int|null>
     */
    public function toArray(): array
    {
        return [
            'header_lines' => $this->headerLines,
            'blank_lines' => $this->blankLines,
            'page_markers' => $this->pageMarkers,
            'first_page' => $this->firstPage,
            'last_page' => $this->lastPage,
            'milestone_tokens' => $this->milestoneTokens,
            'continuation_lines' => $this->continuationLines,
            'paragraph_markers' => $this->paragraphMarkers,
            'bare_markers' => $this->bareMarkers,
            'printed_line_markers' => $this->printedLineMarkers,
            'empty_paragraphs' => $this->emptyParagraphs,
            'pipes' => $this->pipes,
            'braced_runs' => $this->bracedRuns,
            'braced_unbalanced' => $this->bracedUnbalanced,
        ];
    }
}
