<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Services;

use App\Domains\Hadith\Exceptions\HadithDataFileException;

/**
 * Developer-decided extra books of a collection (config hadith.extra_books, ADR 0076 decision 4, step 6b.4). The gaps file must
 * declare exactly these books; HadithOverlayBuilder checks that. The book_number is null until it is decided.
 */
final class HadithExtraBooks
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
                throw new HadithDataFileException('Config [hadith.extra_books] names an unknown collection ['.$slug.'].');
            }
        }
    }

    /**
     * The validated extra books of one slug, in config order.
     *
     * @return list<array{book_number: ?string, after_book: string, first: string, last: string}>
     *
     * @throws HadithDataFileException
     */
    public function forSlug(string $slug): array
    {
        $this->assertKnown();

        $entries = $this->all()[$slug] ?? [];

        if (! is_array($entries) || ($entries !== [] && ! array_is_list($entries))) {
            throw new HadithDataFileException('Config [hadith.extra_books] for ['.$slug.'] must be a list of books.');
        }

        $valid = [];

        foreach ($entries as $entry) {
            $bookNumber = is_array($entry) ? ($entry['book_number'] ?? null) : null;
            $afterBook = is_array($entry) ? ($entry['after_book'] ?? null) : null;
            $first = is_array($entry) ? ($entry['first'] ?? null) : null;
            $last = is_array($entry) ? ($entry['last'] ?? null) : null;

            if (($bookNumber !== null && (! is_string($bookNumber) || $bookNumber === '')) || ! is_string($afterBook) || $afterBook === '' || ! is_string($first) || $first === '' || ! is_string($last) || $last === '') {
                throw new HadithDataFileException('Config [hadith.extra_books] for ['.$slug.'] holds a book that is not valid.');
            }

            $valid[] = ['book_number' => $bookNumber, 'after_book' => $afterBook, 'first' => $first, 'last' => $last];
        }

        return $valid;
    }

    /**
     * @return array<array-key, mixed>
     */
    private function all(): array
    {
        $all = config('hadith.extra_books', []);

        return is_array($all) ? $all : [];
    }
}
