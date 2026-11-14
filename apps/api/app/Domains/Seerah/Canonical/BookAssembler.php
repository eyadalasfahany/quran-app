<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Canonical;

use App\Domains\Seerah\Enums\BlockKind;
use App\Domains\Seerah\Enums\SectionLevel;
use App\Domains\Seerah\Exceptions\SeerahCanonicalException;

/**
 * Turns the blocks into the canonical book (ADR 0089 §3). Stateful for one run only; create a new instance per run.
 *
 * Removed from the text, and nothing else, each token with one adjacent space (the following space, else the preceding one):
 * page markers `PageV##P###` (their number becomes the page of the text after them), milestone tokens `ms###`, the editor's
 * footnote references `«N»` and the HTML tags `</span>`. Also removed: the header, the markers `### | ` (heading wrapper),
 * `# ` (paragraph) and `~~` (continuation, whose line joins the one above with one space). Footnote bodies (`# «N»` blocks)
 * are not paragraphs: they are excluded and counted; their page markers still move the page.
 *
 * The first headings must be the configured front-matter titles, in order (ADR 0089 §4 front matter); every other heading is
 * `heading`.
 */
final class BookAssembler
{
    private const string PAGE_PATTERN = '~PageV\d+P(\d+)~u';

    private const string MILESTONE_PATTERN = '~ms\d{3}(?!\d)~u';

    private const string FOOTNOTE_PATTERN = '~«\d+»~u';

    private const string HTML_TAG_PATTERN = '~</span>~u';

    private const string BRACED_RUN = '~\{[^{}]*\}~u';

    /** The page in force; 0 before the first page marker. */
    private int $page = 0;

    /** @var list<SectionDraft> */
    private array $sectionRows = [];

    /** @var list<CanonicalParagraph> */
    private array $paragraphs = [];

    private ?int $current = null;

    private int $headingIndex = 0;

    /**
     * @param  list<string>  $frontTitles  the exact titles of the front-matter headings, in book order
     */
    public function __construct(
        private readonly CanonicalCounts $counts,
        private readonly UnparsedLines $unparsed,
        private readonly array $frontTitles,
    ) {}

    /**
     * @param  list<SourceBlock>  $blocks
     *
     * @throws SeerahCanonicalException when a line is unparsed, the front matter does not match, or the book has no heading
     */
    public function assemble(array $blocks): CanonicalBook
    {
        foreach ($blocks as $block) {
            $this->assembleBlock($block);
        }

        if (! $this->unparsed->isEmpty()) {
            throw new SeerahCanonicalException('The source has unparsed lines: '.$this->unparsed->summary().'.');
        }

        if ($this->headingIndex < count($this->frontTitles)) {
            throw new SeerahCanonicalException('The source has fewer headings than its front matter (front_mismatch).');
        }

        if ($this->sectionRows === []) {
            throw new SeerahCanonicalException('The source has no heading (no_headings).');
        }

        $sections = [];

        foreach ($this->sectionRows as $draft) {
            $sections[] = $draft->toSection();
        }

        $this->countMarkup($sections);

        return new CanonicalBook($sections, $this->paragraphs, $this->counts);
    }

    private function assembleBlock(SourceBlock $block): void
    {
        $first = $block->lines[0]->number;

        if ($block->kind === BlockKind::Footnote) {
            foreach ($block->lines as $line) {
                $this->stripTokens($line->body, false);
            }

            return;
        }

        $blockPage = $this->page;
        $parts = [];

        foreach ($block->lines as $position => $line) {
            $text = $this->stripTokens($line->body, true);

            if ($position === 0) {
                $blockPage = $this->page;
            }

            if ($text !== '') {
                $parts[] = $text;
            }
        }

        $joined = implode(' ', $parts);

        if ($block->kind === BlockKind::Paragraph) {
            $this->addParagraph($joined, $blockPage, $first);

            return;
        }

        if (count($block->lines) > 1) {
            $this->unparsed->add($first, 'heading_split');

            return;
        }

        if ($joined === '') {
            $this->counts->emptyHeadings++;

            return;
        }

        $this->addHeading($joined, $blockPage, $first);
    }

    private function addHeading(string $title, int $page, int $line): void
    {
        if (str_contains($title, "\t")) {
            $this->unparsed->add($line, 'tab_in_text');

            return;
        }

        $level = SectionLevel::Heading;

        if ($this->headingIndex < count($this->frontTitles)) {
            if ($title !== $this->frontTitles[$this->headingIndex]) {
                throw new SeerahCanonicalException('A front-matter heading differs from the configured title (front_mismatch).');
            }

            $level = SectionLevel::Front;
        }

        $this->headingIndex++;
        $this->openSection($level, $title, $page);
    }

    private function openSection(SectionLevel $level, string $title, int $page): void
    {
        $id = sprintf('s%03d', count($this->sectionRows) + 1);
        $this->sectionRows[] = new SectionDraft($id, $level, $title, $page);
        $this->current = count($this->sectionRows) - 1;
    }

    private function addParagraph(string $text, int $page, int $line): void
    {
        if ($text === '') {
            $this->counts->emptyParagraphs++;

            return;
        }

        if (str_contains($text, "\t")) {
            $this->unparsed->add($line, 'tab_in_text');

            return;
        }

        if ($this->current === null) {
            $this->openSection(SectionLevel::Front, '', $page);
        }

        $section = $this->sectionRows[$this->current ?? 0];
        $id = sprintf('p%05d', count($this->paragraphs) + 1);
        $this->paragraphs[] = new CanonicalParagraph($id, $section->id, $page, $text);

        $section->paragraphFrom ??= $id;
        $section->paragraphTo = $id;
    }

    /**
     * Removes the tokens of a line, each with one adjacent space. With $keep false (a footnote body) only the page markers
     * are applied and counted; the text is discarded.
     */
    private function stripTokens(string $body, bool $keep): string
    {
        $tokens = $this->tokens($body, $keep);

        if ($tokens === []) {
            return $body;
        }

        $length = strlen($body);
        $skip = array_fill(0, $length, false);

        foreach ($tokens as $token) {
            $offset = $token['offset'];
            $after = $offset + $token['length'];

            if ($token['page'] !== null) {
                $this->page = $token['page'];
                $this->counts->pageMarkers++;
                $this->counts->firstPage ??= $this->page;
                $this->counts->lastPage = $this->page;
            } elseif ($token['kind'] === 'ms') {
                $this->counts->milestoneTokens++;
            } elseif ($token['kind'] === 'fn') {
                $this->counts->footnoteReferences++;
            } else {
                $this->counts->htmlTags++;
            }

            for ($i = $offset; $i < $after; $i++) {
                $skip[$i] = true;
            }

            if ($after < $length && $body[$after] === ' ') {
                $skip[$after] = true;
            } elseif ($offset > 0 && $body[$offset - 1] === ' ' && ! $skip[$offset - 1]) {
                $skip[$offset - 1] = true;
            }
        }

        if (! $keep) {
            return '';
        }

        $out = '';

        for ($i = 0; $i < $length; $i++) {
            if (! $skip[$i]) {
                $out .= $body[$i];
            }
        }

        return $out;
    }

    /**
     * The tokens of a line in order of position. Page markers are always listed; the other kinds only when $keep is true.
     *
     * @return list<array{offset: int, length: int, page: ?int, kind: string}>
     */
    private function tokens(string $body, bool $keep): array
    {
        $tokens = [];

        if (preg_match_all(self::PAGE_PATTERN, $body, $pages, PREG_OFFSET_CAPTURE) > 0) {
            foreach ($pages[0] as $index => [$text, $offset]) {
                $tokens[] = ['offset' => $offset, 'length' => strlen($text), 'page' => (int) $pages[1][$index][0], 'kind' => 'page'];
            }
        }

        if ($keep) {
            $this->addTokens($tokens, self::MILESTONE_PATTERN, 'ms', $body);
            $this->addTokens($tokens, self::FOOTNOTE_PATTERN, 'fn', $body);
            $this->addTokens($tokens, self::HTML_TAG_PATTERN, 'html', $body);
        }

        usort($tokens, static fn (array $a, array $b): int => $a['offset'] <=> $b['offset']);

        return $tokens;
    }

    /**
     * @param  list<array{offset: int, length: int, page: ?int, kind: string}>  $tokens
     */
    private function addTokens(array &$tokens, string $pattern, string $kind, string $body): void
    {
        if (preg_match_all($pattern, $body, $matches, PREG_OFFSET_CAPTURE) > 0) {
            foreach ($matches[0] as [$text, $offset]) {
                $tokens[] = ['offset' => $offset, 'length' => strlen($text), 'page' => null, 'kind' => $kind];
            }
        }
    }

    /**
     * @param  list<CanonicalSection>  $sections
     */
    private function countMarkup(array $sections): void
    {
        foreach ($sections as $section) {
            $this->countText($section->title);
        }

        foreach ($this->paragraphs as $paragraph) {
            $this->countText($paragraph->text);
        }
    }

    private function countText(string $text): void
    {
        $runs = preg_match_all(self::BRACED_RUN, $text);

        $this->counts->bracedRuns += $runs === false ? 0 : $runs;
        $this->counts->pipes += substr_count($text, '|');

        if (substr_count($text, '{') !== substr_count($text, '}')) {
            $this->counts->bracedUnbalanced++;
        }
    }
}
