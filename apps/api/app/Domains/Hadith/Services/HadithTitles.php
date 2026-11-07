<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Services;

/**
 * Reads config('hadith_titles') on every call. Titles are approved data: a missing or empty title is null, never invented.
 */
final class HadithTitles
{
    public function collectionTitleAr(string $slug): ?string
    {
        $entry = $this->collectionEntry($slug);
        $title = $entry['title_ar'] ?? null;

        return is_string($title) && $title !== '' ? $title : null;
    }

    /**
     * Only an approved author is used.
     */
    public function authorAr(string $slug): ?string
    {
        $entry = $this->collectionEntry($slug);
        $author = $entry['author_ar'] ?? null;

        if (($entry['author_ar_status'] ?? null) !== 'approved') {
            return null;
        }

        return is_string($author) && $author !== '' ? $author : null;
    }

    public function sectionTitleAr(string $slug, string $sectionKey): ?string
    {
        $sections = config('hadith_titles.sections', []);
        $entry = is_array($sections) && is_array($sections[$slug] ?? null) ? ($sections[$slug][$sectionKey] ?? null) : null;
        $title = is_array($entry) ? ($entry['title_ar'] ?? null) : null;

        return is_string($title) && $title !== '' ? $title : null;
    }

    /**
     * Everything the importer reads for a slug, for the fingerprint.
     *
     * @return array<string, mixed>
     */
    public function forSlug(string $slug): array
    {
        $sections = config('hadith_titles.sections', []);

        return [
            'collection' => $this->collectionEntry($slug),
            'sections' => is_array($sections) ? ($sections[$slug] ?? null) : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function collectionEntry(string $slug): array
    {
        $collections = config('hadith_titles.collections', []);
        $entry = is_array($collections) ? ($collections[$slug] ?? null) : null;

        return is_array($entry) ? $entry : [];
    }
}
