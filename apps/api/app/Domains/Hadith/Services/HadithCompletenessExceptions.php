<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Services;

use App\Domains\Hadith\Exceptions\HadithDataFileException;

/**
 * Developer-decided numbers accepted as complete without text, merge or fill (config hadith.completeness_exceptions, ADR 0076
 * «Rule, 7 Nov 2026»). Not reference_exceptions: a different check. Every value is validated here.
 */
final class HadithCompletenessExceptions
{
    /**
     * Checks every configured slug. Called before any import work.
     *
     * @throws HadithDataFileException
     */
    public function assertKnown(): void
    {
        foreach (array_keys($this->all()) as $slug) {
            if (! in_array((string) $slug, array_map('strval', (array) config('hadith.collections')), true)) {
                throw new HadithDataFileException('Config [hadith.completeness_exceptions] names an unknown collection ['.$slug.'].');
            }
        }
    }

    /**
     * The validated numbers of one slug.
     *
     * @return list<string>
     *
     * @throws HadithDataFileException
     */
    public function forSlug(string $slug): array
    {
        $this->assertKnown();

        $list = $this->all()[$slug] ?? [];

        if (! is_array($list)) {
            throw new HadithDataFileException('Config [hadith.completeness_exceptions] for ['.$slug.'] must be a list of numbers.');
        }

        $numbers = [];

        foreach ($list as $number) {
            if (! is_string($number) || $number === '') {
                throw new HadithDataFileException('Config [hadith.completeness_exceptions] for ['.$slug.'] holds a value that is not a non-empty string.');
            }

            $numbers[] = $number;
        }

        return $numbers;
    }

    /**
     * @return array<array-key, mixed>
     */
    private function all(): array
    {
        $all = config('hadith.completeness_exceptions', []);

        return is_array($all) ? $all : [];
    }
}
