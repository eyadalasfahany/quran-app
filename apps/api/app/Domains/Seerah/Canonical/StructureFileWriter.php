<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Canonical;

use App\Domains\Seerah\Enums\SectionLevel;

/**
 * Renders book/structure.json (data-format.md): fixed key order, Arabic as literal characters, two-space indent, one trailing
 * newline. The canonical paragraph text is not in the file (it is derived on every run).
 */
final class StructureFileWriter
{
    public function render(CanonicalBuild $build): string
    {
        $book = $build->book;

        $data = [
            'format' => 1,
            'source_sha256' => $build->sourceSha256,
            'canonical_sha256' => $build->canonicalSha256,
            'counts' => [
                'sections_by_level' => $this->sectionsByLevel($book),
                'paragraphs' => count($book->paragraphs),
                'canonical' => $book->counts->toArray(),
            ],
            'sections' => array_map(
                static fn (CanonicalSection $section): array => [
                    'id' => $section->id,
                    'level' => $section->level->value,
                    'title' => $section->title,
                    'page' => $section->page,
                    'paragraph_from' => $section->paragraphFrom,
                    'paragraph_to' => $section->paragraphTo,
                ],
                $book->sections,
            ),
        ];

        return SeerahJson::render($data);
    }

    /**
     * @return array<string, int>
     */
    private function sectionsByLevel(CanonicalBook $book): array
    {
        $counts = [];

        foreach (SectionLevel::cases() as $level) {
            $counts[$level->value] = 0;
        }

        foreach ($book->sections as $section) {
            $counts[$section->level->value]++;
        }

        return $counts;
    }
}
