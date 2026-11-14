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

    /** Editor's footnote references «N» inside headings and paragraphs (removed with one adjacent space). */
    public int $footnoteReferences = 0;

    /** Shamela HTML `</span>` tags (removed with one adjacent space). */
    public int $htmlTags = 0;

    public int $continuationLines = 0;

    public int $paragraphMarkers = 0;

    public int $bareMarkers = 0;

    /** Editor's footnote bodies (`# «N»` and their continuations): excluded from the book, counted here. */
    public int $footnoteBlocks = 0;

    public int $footnoteLines = 0;

    /** Heading wrappers with no text (`### | `): dropped, counted. */
    public int $emptyHeadings = 0;

    /** Paragraphs that had no text after the removals. Not kept. */
    public int $emptyParagraphs = 0;

    /** Pipes `|` left in the canonical text. */
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
            'footnote_references' => $this->footnoteReferences,
            'html_tags' => $this->htmlTags,
            'continuation_lines' => $this->continuationLines,
            'paragraph_markers' => $this->paragraphMarkers,
            'bare_markers' => $this->bareMarkers,
            'footnote_blocks' => $this->footnoteBlocks,
            'footnote_lines' => $this->footnoteLines,
            'empty_headings' => $this->emptyHeadings,
            'empty_paragraphs' => $this->emptyParagraphs,
            'pipes' => $this->pipes,
            'braced_runs' => $this->bracedRuns,
            'braced_unbalanced' => $this->bracedUnbalanced,
        ];
    }
}
