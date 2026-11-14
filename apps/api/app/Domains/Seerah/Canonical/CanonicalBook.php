<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Canonical;

/**
 * The canonical book: every section in book order, every paragraph in book order, and the counts of the run. Immutable.
 */
final readonly class CanonicalBook
{
    /**
     * @param  list<CanonicalSection>  $sections
     * @param  list<CanonicalParagraph>  $paragraphs
     */
    public function __construct(
        public array $sections,
        public array $paragraphs,
        public CanonicalCounts $counts,
    ) {}

    /**
     * The canonical serialisation the pin is taken over: one line per section (`S`) and per paragraph (`P`), in book order,
     * with ids, levels, pages and text. Tabs and line breaks never occur inside a value (checked by the canonicalizer).
     */
    public function serialise(): string
    {
        $paragraphsBySection = [];

        foreach ($this->paragraphs as $paragraph) {
            $paragraphsBySection[$paragraph->sectionId][] = $paragraph;
        }

        $out = '';

        foreach ($this->sections as $section) {
            $out .= 'S'."\t".$section->id."\t".$section->level->value."\t".$section->page."\t".$section->title."\n";

            foreach ($paragraphsBySection[$section->id] ?? [] as $paragraph) {
                $out .= 'P'."\t".$paragraph->id."\t".$paragraph->page."\t".$paragraph->text."\n";
            }
        }

        return $out;
    }

    public function sha256(): string
    {
        return hash('sha256', $this->serialise());
    }
}
