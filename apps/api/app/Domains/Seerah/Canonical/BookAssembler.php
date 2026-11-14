<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Canonical;

use App\Domains\Seerah\Enums\SectionLevel;
use App\Domains\Seerah\Exceptions\SeerahCanonicalException;

/**
 * Turns the blocks into the canonical book (ADR 0089 §3). Stateful for one run only; create a new instance per run.
 *
 * Removed from the text, and nothing else: page markers (their number is kept as the page of the text that follows) and
 * milestone tokens, each with one adjacent space; the paragraph marker and the heading wrapper (already read by the reader);
 * the joins of continuation lines, which become one space. A page marker, a milestone and a join never change a letter.
 *
 * Headings: `# | N ( title ) N` (the number is printed as text, the title is kept exactly); a `# | ` line of one line that starts
 * with «الباب» or «الفصل» is a Bab or a Fasl (its ordinal is read from the next word); any other one-line `# | ` is a heading.
 * A `# | ` block of more than one line is body text that shares the wrapper, not a heading.
 */
final class BookAssembler
{
    private const string TOKEN_PATTERN = '~PageV(\d+)P(\d+)|ms(\d{3})(?!\d)~u';

    private const string NUMBERED_START = '~^\d+ \( ~u';

    private const string NUMBERED_HEADING = '~^(\d+) \( (.+) \) (\d+)$~u';

    private const string BRACED_RUN = '~\{[^{}]*\}~u';

    /** The ordinals of the book's Bab and Fasl lines, as the book spells them. */
    private const array ORDINALS = [
        'الأول' => 1,
        'الثاني' => 2,
        'الثالث' => 3,
        'الرابع' => 4,
        'الخامس' => 5,
        'السادس' => 6,
        'السابع' => 7,
        'الثامن' => 8,
        'التاسع' => 9,
        'العاشر' => 10,
    ];

    /** The page in force; 0 before the first page marker. */
    private int $page = 0;

    /** @var list<array{id: string, level: SectionLevel, number: ?int, printed: ?string, parent: ?string, title: string, page: int, from: ?string, to: ?string}> */
    private array $sectionRows = [];

    /** @var list<CanonicalParagraph> */
    private array $paragraphs = [];

    /** @var list<array{rank: int, id: string}> */
    private array $stack = [];

    private ?int $current = null;

    public function __construct(
        private readonly CanonicalCounts $counts,
        private readonly UnparsedLines $unparsed,
    ) {}

    /**
     * @param  list<SourceBlock>  $blocks
     *
     * @throws SeerahCanonicalException when a line is unparsed or the book has no heading
     */
    public function assemble(array $blocks): CanonicalBook
    {
        foreach ($blocks as $block) {
            $this->assembleBlock($block);
        }

        if (! $this->unparsed->isEmpty()) {
            throw new SeerahCanonicalException('The source has unparsed lines: '.$this->unparsed->summary().'.');
        }

        if ($this->sectionRows === []) {
            throw new SeerahCanonicalException('The source has no heading (no_headings).');
        }

        $sections = [];

        foreach ($this->sectionRows as $row) {
            $sections[] = new CanonicalSection(
                id: $row['id'],
                level: $row['level'],
                number: $row['number'],
                printedNumber: $row['printed'],
                parentId: $row['parent'],
                title: $row['title'],
                page: $row['page'],
                paragraphFrom: $row['from'],
                paragraphTo: $row['to'],
            );
        }

        $this->countMarkup($sections);

        return new CanonicalBook($sections, $this->paragraphs, $this->counts);
    }

    private function assembleBlock(SourceBlock $block): void
    {
        $parts = [];
        $firstText = '';
        $blockPage = $this->page;
        $first = $block->lines[0]->number;

        foreach ($block->lines as $position => $line) {
            $text = $this->stripTokens($line->body);

            if ($position === 0) {
                $firstText = $text;
                $blockPage = $this->page;
            }

            if ($text !== '') {
                $parts[] = $text;
            }
        }

        $joined = implode(' ', $parts);

        if (! $block->headingWrap) {
            $this->paragraphOrEmpty($joined, $blockPage, $first);

            return;
        }

        if (preg_match(self::NUMBERED_START, $firstText) === 1) {
            if (preg_match(self::NUMBERED_HEADING, $joined, $match) === 1 && $match[1] === $match[3]) {
                $this->addHeading(SectionLevel::Heading, null, $match[1], $match[2], $blockPage, $first);

                return;
            }

            $this->unparsed->add($first, 'heading_numbered');

            return;
        }

        if (count($block->lines) > 1) {
            if ($this->isStructural($firstText)) {
                $this->unparsed->add($first, 'heading_split');

                return;
            }

            $this->paragraphOrEmpty($joined, $blockPage, $first);

            return;
        }

        if ($joined === '') {
            $this->unparsed->add($first, 'heading_empty');

            return;
        }

        if (! $this->isStructural($joined)) {
            $this->addHeading(SectionLevel::Heading, null, null, $joined, $blockPage, $first);

            return;
        }

        $ordinal = $this->ordinal($joined);

        if ($ordinal === null) {
            $this->unparsed->add($first, 'heading_ordinal');

            return;
        }

        $level = str_starts_with($joined, 'الباب ') ? SectionLevel::Bab : SectionLevel::Fasl;
        $this->addHeading($level, $ordinal, null, $joined, $blockPage, $first);
    }

    private function paragraphOrEmpty(string $text, int $page, int $line): void
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
            $this->openSection(SectionLevel::Front, null, null, '', $page);
        }

        $sectionIndex = $this->current ?? 0;
        $id = sprintf('p%05d', count($this->paragraphs) + 1);
        $this->paragraphs[] = new CanonicalParagraph($id, $this->sectionRows[$sectionIndex]['id'], $page, $text);

        $this->sectionRows[$sectionIndex]['from'] ??= $id;
        $this->sectionRows[$sectionIndex]['to'] = $id;
    }

    private function addHeading(SectionLevel $level, ?int $number, ?string $printed, string $title, int $page, int $line): void
    {
        if (str_contains($title, "\t")) {
            $this->unparsed->add($line, 'tab_in_text');

            return;
        }

        $this->openSection($level, $number, $printed, $title, $page);
    }

    private function openSection(SectionLevel $level, ?int $number, ?string $printed, string $title, int $page): void
    {
        while ($this->stack !== [] && $this->stack[array_key_last($this->stack)]['rank'] >= $level->rank()) {
            array_pop($this->stack);
        }

        $parent = $this->stack === [] ? null : $this->stack[array_key_last($this->stack)]['id'];
        $id = sprintf('s%03d', count($this->sectionRows) + 1);

        $this->sectionRows[] = [
            'id' => $id,
            'level' => $level,
            'number' => $number,
            'printed' => $printed,
            'parent' => $parent,
            'title' => $title,
            'page' => $page,
            'from' => null,
            'to' => null,
        ];
        $this->current = count($this->sectionRows) - 1;

        if ($level !== SectionLevel::Front) {
            $this->stack[] = ['rank' => $level->rank(), 'id' => $id];
        }
    }

    /**
     * Removes page markers and milestone tokens with one adjacent space each, counting them. A page marker sets the page in
     * force; its number is the page the following text is on.
     */
    private function stripTokens(string $body): string
    {
        $found = preg_match_all(self::TOKEN_PATTERN, $body, $matches, PREG_SET_ORDER | PREG_OFFSET_CAPTURE);

        if ($found === false || $found === 0) {
            return $body;
        }

        $length = strlen($body);
        $skip = array_fill(0, $length, false);

        foreach ($matches as $match) {
            $offset = $match[0][1];
            $size = strlen($match[0][0]);
            $isPage = $match[1][0] !== '';

            if ($isPage) {
                $this->page = (int) $match[2][0];
                $this->counts->pageMarkers++;
                $this->counts->firstPage ??= $this->page;
                $this->counts->lastPage = $this->page;
            } else {
                $this->counts->milestoneTokens++;
            }

            for ($i = $offset; $i < $offset + $size; $i++) {
                $skip[$i] = true;
            }

            $after = $offset + $size;

            if ($after < $length && $body[$after] === ' ') {
                $skip[$after] = true;
            } elseif ($offset > 0 && $body[$offset - 1] === ' ' && ! $skip[$offset - 1]) {
                $skip[$offset - 1] = true;
            }
        }

        $out = '';

        for ($i = 0; $i < $length; $i++) {
            if (! $skip[$i]) {
                $out .= $body[$i];
            }
        }

        return $out;
    }

    private function isStructural(string $text): bool
    {
        return str_starts_with($text, 'الباب ') || str_starts_with($text, 'الفصل ');
    }

    private function ordinal(string $text): ?int
    {
        $words = array_values(array_filter(explode(' ', $text), static fn (string $word): bool => $word !== ''));

        return self::ORDINALS[$words[1] ?? ''] ?? null;
    }

    /**
     * @param  list<CanonicalSection>  $sections
     */
    private function countMarkup(array $sections): void
    {
        foreach ($sections as $section) {
            $this->countBraces($section->title);
            $this->counts->pipes += substr_count($section->title, '|');
        }

        foreach ($this->paragraphs as $paragraph) {
            $this->countBraces($paragraph->text);
            $this->counts->pipes += substr_count($paragraph->text, '|');
        }
    }

    private function countBraces(string $text): void
    {
        $runs = preg_match_all(self::BRACED_RUN, $text);

        $this->counts->bracedRuns += $runs === false ? 0 : $runs;

        if (substr_count($text, '{') !== substr_count($text, '}')) {
            $this->counts->bracedUnbalanced++;
        }
    }
}
