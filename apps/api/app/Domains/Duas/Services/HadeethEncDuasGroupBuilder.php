<?php

declare(strict_types=1);

namespace App\Domains\Duas\Services;

use App\Domains\Azkar\Exceptions\SnapshotException;

/**
 * Builds HadeethEnc category groups for prophetic duas from a pinned snapshot directory (ADR 0044-duas §3).
 */
final class HadeethEncDuasGroupBuilder
{
    /**
     * @return array{
     *     groups: list<array{id: int, source_category_id: int, title: string, position: int}>,
     *     hadithPrimaryGroup: array<int, int>
     * }
     *
     * @throws SnapshotException
     */
    public function build(string $directory): array
    {
        $manifestPath = $directory.DIRECTORY_SEPARATOR.'manifest.json';
        $manifest = is_file($manifestPath) ? json_decode((string) file_get_contents($manifestPath), true) : null;

        if (! is_array($manifest) || ! is_array($manifest['categories'] ?? null)) {
            throw new SnapshotException('The Duas HadeethEnc snapshot manifest has no category list.');
        }

        $categoriesPath = $directory.DIRECTORY_SEPARATOR.'categories.json';

        if (! is_file($categoriesPath)) {
            throw new SnapshotException('The Duas HadeethEnc snapshot has no categories.json file.');
        }

        $categoriesBody = str_starts_with((string) file_get_contents($categoriesPath), "\xEF\xBB\xBF")
            ? substr((string) file_get_contents($categoriesPath), 3)
            : (string) file_get_contents($categoriesPath);
        $categoriesList = json_decode($categoriesBody, true, 512, JSON_THROW_ON_ERROR);

        if (! is_array($categoriesList)) {
            throw new SnapshotException('The Duas HadeethEnc categories file is not a JSON list.');
        }

        $titles = [];

        foreach ($categoriesList as $category) {
            if (! is_array($category)) {
                continue;
            }

            $id = (int) ($category['id'] ?? 0);

            if ($id > 0 && is_string($category['title'] ?? null)) {
                $titles[$id] = $category['title'];
            }
        }

        $groups = [];
        $hadithPrimaryGroup = [];
        $nextGroupId = 1;
        $position = 1;

        foreach ($manifest['categories'] as $categoryId) {
            $categoryId = (int) $categoryId;

            if ($categoryId <= 0) {
                continue;
            }

            $title = $titles[$categoryId] ?? '';

            if ($title === '') {
                continue;
            }

            $groupId = $nextGroupId++;
            $groups[] = [
                'id' => $groupId,
                'source_category_id' => $categoryId,
                'title' => $title,
                'position' => $position++,
            ];

            foreach ($this->hadithIdsInCategory($directory, $categoryId) as $hadithId) {
                if (! isset($hadithPrimaryGroup[$hadithId])) {
                    $hadithPrimaryGroup[$hadithId] = $groupId;
                }
            }
        }

        return [
            'groups' => $groups,
            'hadithPrimaryGroup' => $hadithPrimaryGroup,
        ];
    }

    /**
     * @return list<int>
     */
    private function hadithIdsInCategory(string $directory, int $categoryId): array
    {
        $ids = [];
        $page = 1;

        while (true) {
            $path = $directory.DIRECTORY_SEPARATOR.'list-'.$categoryId.'-'.$page.'.json';

            if (! is_file($path)) {
                break;
            }

            $bytes = (string) file_get_contents($path);
            $body = str_starts_with($bytes, "\xEF\xBB\xBF") ? substr($bytes, 3) : $bytes;
            $decoded = json_decode($body, true, 512, JSON_THROW_ON_ERROR);

            if (! is_array($decoded)) {
                throw new SnapshotException('A Duas HadeethEnc list file is not a JSON object.');
            }

            $data = is_array($decoded['data'] ?? null) ? $decoded['data'] : [];

            foreach ($data as $row) {
                if (! is_array($row)) {
                    continue;
                }

                $id = (int) ($row['id'] ?? 0);

                if ($id > 0) {
                    $ids[] = $id;
                }
            }

            $lastPage = is_array($decoded['meta'] ?? null) ? (int) ($decoded['meta']['last_page'] ?? 1) : 1;
            $page++;

            if ($page > $lastPage) {
                break;
            }
        }

        return $ids;
    }
}
