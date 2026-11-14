<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Dataset;

use App\Domains\Seerah\Canonical\CanonicalBook;
use App\Domains\Seerah\Canonical\CanonicalParagraph;
use App\Domains\Seerah\Canonical\CanonicalSection;

/**
 * Lookups over the canonical book: sections and paragraphs by id, the paragraphs of each section in order, and the year that
 * governs each section (the last year heading at or before it, V12). Built once per run.
 */
final class BookIndex
{
    /** @var array<string, CanonicalSection> */
    private array $sections = [];

    /** @var array<string, int> */
    private array $sectionPosition = [];

    /** @var array<string, CanonicalParagraph> */
    private array $paragraphs = [];

    /** @var array<string, int> */
    private array $paragraphPosition = [];

    /** @var array<string, list<string>> */
    private array $paragraphsOfSection = [];

    /** @var array<string, int> */
    private array $yearOfSection = [];

    /**
     * @param  CanonicalBook  $book
     * @param  array<string, int>  $yearHeadings  heading title => Hijri year
     */
    public function __construct(CanonicalBook $book, array $yearHeadings)
    {
        $year = null;

        foreach ($book->sections as $position => $section) {
            $this->sections[$section->id] = $section;
            $this->sectionPosition[$section->id] = $position;
            $this->paragraphsOfSection[$section->id] = [];

            if (array_key_exists($section->title, $yearHeadings)) {
                $year = $yearHeadings[$section->title];
            }

            if ($year !== null) {
                $this->yearOfSection[$section->id] = $year;
            }
        }

        foreach ($book->paragraphs as $position => $paragraph) {
            $this->paragraphs[$paragraph->id] = $paragraph;
            $this->paragraphPosition[$paragraph->id] = $position;
            $this->paragraphsOfSection[$paragraph->sectionId][] = $paragraph->id;
        }
    }

    public function hasSection(string $id): bool
    {
        return isset($this->sections[$id]);
    }

    public function section(string $id): ?CanonicalSection
    {
        return $this->sections[$id] ?? null;
    }

    /**
     * @return list<CanonicalSection>
     */
    public function sections(): array
    {
        return array_values($this->sections);
    }

    public function sectionPosition(string $id): ?int
    {
        return $this->sectionPosition[$id] ?? null;
    }

    public function hasParagraph(string $id): bool
    {
        return isset($this->paragraphs[$id]);
    }

    public function paragraph(string $id): ?CanonicalParagraph
    {
        return $this->paragraphs[$id] ?? null;
    }

    public function paragraphPosition(string $id): ?int
    {
        return $this->paragraphPosition[$id] ?? null;
    }

    /**
     * @return list<string>
     */
    public function paragraphsOf(string $sectionId): array
    {
        return $this->paragraphsOfSection[$sectionId] ?? [];
    }

    /**
     * The Hijri year that governs a section, or null before the first year heading.
     */
    public function yearOf(string $sectionId): ?int
    {
        return $this->yearOfSection[$sectionId] ?? null;
    }

    /**
     * The paragraph indices (inside the section's own list) that a span covers, or the whole section when the span is null. Null
     * when the span is not inside the section.
     *
     * @return array{int, int}|null
     */
    public function coveredIndices(string $sectionId, ?Span $span): ?array
    {
        $ids = $this->paragraphsOf($sectionId);

        if ($span === null) {
            return $ids === [] ? null : [0, count($ids) - 1];
        }

        $from = array_search($span->from, $ids, true);
        $to = array_search($span->to, $ids, true);

        if ($from === false || $to === false || $from > $to) {
            return null;
        }

        return [$from, $to];
    }
}
