<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Sources;

use App\Domains\Azkar\Exceptions\SnapshotException;
use App\Support\Storage\SourceCache;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;

/**
 * Fetches the HadeethEnc categories, the hadith lists of the configured categories (and their children), and each
 * distinct hadith once, sequentially and politely (ADR 0031 §12). Bytes are stored as received; the manifest's
 * whole-file SHA-256 is the pin. Nothing is pinned from a failed snapshot.
 */
final class HadeethEncSnapshotter
{
    /**
     * @param  non-empty-string  $configPrefix  Config path prefix, e.g. `azkar.hadeethenc` or `duas.hadeethenc`.
     * @param  non-empty-string  $storageRelative  Directory under the source cache (SourceCache), e.g. `azkar/hadeethenc`.
     * @return array{directory: string, categories: int, list_pages: int, hadiths: int, files: int, manifest_sha256: string}
     *
     * @throws SnapshotException
     */
    public function take(string $date, string $configPrefix = 'azkar.hadeethenc', string $storageRelative = 'azkar/hadeethenc'): array
    {
        $base = rtrim((string) config($configPrefix.'.api_base'), '/');
        $language = (string) config($configPrefix.'.language', 'ar');
        $perPage = (int) config($configPrefix.'.per_page', 100);

        $categoriesBytes = $this->fetch($base.'/categories/list/?language='.$language, $configPrefix);
        $categories = $this->decodeList($categoriesBytes, 'categories');
        $wanted = $this->wantedCategories($categories, $configPrefix);

        $files = ['categories.json' => $categoriesBytes];
        $hadithIds = [];
        $pages = 0;

        foreach ($wanted as $categoryId) {
            $page = 1;

            do {
                $this->pause($configPrefix);
                $bytes = $this->fetch($base.'/hadeeths/list/?language='.$language.'&category_id='.$categoryId.'&per_page='.$perPage.'&page='.$page, $configPrefix);
                $files['list-'.$categoryId.'-'.$page.'.json'] = $bytes;
                $pages++;

                $body = $this->decode($bytes);
                $data = is_array($body['data'] ?? null) ? $body['data'] : [];

                foreach ($data as $hadith) {
                    if (is_array($hadith) && (is_int($hadith['id'] ?? null) || is_string($hadith['id'] ?? null))) {
                        $hadithIds[(string) $hadith['id']] = true;
                    }
                }

                $lastPage = is_array($body['meta'] ?? null) ? (int) ($body['meta']['last_page'] ?? 1) : 1;
                $page++;
            } while ($page <= $lastPage);
        }

        $ids = array_map('strval', array_keys($hadithIds));
        sort($ids, SORT_NATURAL);

        foreach ($ids as $id) {
            $this->pause($configPrefix);
            $bytes = $this->fetch($base.'/hadeeths/one/?language='.$language.'&id='.$id, $configPrefix);
            $record = $this->decode($bytes);

            if ((string) ($record['id'] ?? '') !== $id || ! is_string($record['hadeeth'] ?? null)) {
                throw new SnapshotException('A HadeethEnc record does not match the id it was requested for.');
            }

            $files['hadith-'.$id.'.json'] = $bytes;
        }

        $directory = SourceCache::path($storageRelative.'/'.$date);
        File::ensureDirectoryExists($directory);

        $hashes = [];

        foreach ($files as $name => $bytes) {
            File::put($directory.DIRECTORY_SEPARATOR.$name, $bytes);
            $hashes[$name] = hash('sha256', $bytes);
        }

        ksort($hashes);
        $manifestSha = hash('sha256', (string) json_encode($hashes, JSON_THROW_ON_ERROR));

        File::put($directory.DIRECTORY_SEPARATOR.'manifest.json', (string) json_encode([
            'source' => 'hadeethenc',
            'date' => $date,
            'categories' => $wanted,
            'hadith_count' => count($ids),
            'files' => $hashes,
            'sha256' => $manifestSha,
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));

        return [
            'directory' => $directory,
            'categories' => count($wanted),
            'list_pages' => $pages,
            'hadiths' => count($ids),
            'files' => count($files),
            'manifest_sha256' => $manifestSha,
        ];
    }

    /**
     * The configured categories, then every child of a configured category (a child of a child included), in the
     * order the API lists them. A category id appears once.
     *
     * @param  list<array<array-key, mixed>>  $categories
     * @return list<int>
     */
    private function wantedCategories(array $categories, string $configPrefix): array
    {
        $wanted = array_map('intval', (array) config($configPrefix.'.category_ids', []));
        $changed = true;

        while ($changed) {
            $changed = false;

            foreach ($categories as $category) {
                $id = (int) ($category['id'] ?? 0);
                $parent = $category['parent_id'] ?? null;

                if ($id > 0 && $parent !== null && $parent !== '' && in_array((int) $parent, $wanted, true) && ! in_array($id, $wanted, true)) {
                    $wanted[] = $id;
                    $changed = true;
                }
            }
        }

        $known = array_map(static fn (array $category): int => (int) ($category['id'] ?? 0), $categories);

        return array_values(array_unique(array_filter($wanted, static fn (int $id): bool => in_array($id, $known, true))));
    }

    /**
     * @return list<array<array-key, mixed>>
     *
     * @throws SnapshotException
     */
    private function decodeList(string $bytes, string $what): array
    {
        $data = $this->decode($bytes);

        if (! array_is_list($data) || $data === []) {
            throw new SnapshotException('The HadeethEnc '.$what.' response is not a list.');
        }

        return $data;
    }

    /**
     * @return array<array-key, mixed>
     *
     * @throws SnapshotException
     */
    private function decode(string $bytes): array
    {
        $body = str_starts_with($bytes, "\xEF\xBB\xBF") ? substr($bytes, 3) : $bytes;

        try {
            $data = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new SnapshotException('A HadeethEnc response is not valid UTF-8 JSON.');
        }

        if (! is_array($data)) {
            throw new SnapshotException('A HadeethEnc response does not hold a JSON object or list.');
        }

        return $data;
    }

    /**
     * Retries connection failures, 429 and 5xx with a fixed delay. Other client errors fail at once.
     *
     * @throws SnapshotException
     */
    private function fetch(string $url, string $configPrefix): string
    {
        try {
            $response = Http::withUserAgent($this->userAgent())
                ->timeout(60)
                ->retry(
                    3,
                    (int) config($configPrefix.'.retry_delay_ms', 1000),
                    fn (\Throwable $exception): bool => $exception instanceof ConnectionException
                        || ($exception instanceof RequestException && ($exception->response->status() === 429 || $exception->response->status() >= 500)),
                )
                ->get($url)
                ->throw();
        } catch (ConnectionException|RequestException) {
            throw new SnapshotException('The HadeethEnc source did not answer a request; nothing was written.');
        }

        return $response->body();
    }

    private function pause(string $configPrefix): void
    {
        $gap = (int) config($configPrefix.'.gap_ms', 300);

        if ($gap > 0) {
            usleep($gap * 1000);
        }
    }

    private function userAgent(): string
    {
        $email = config('quran.qf.contact_email');

        return is_string($email) && $email !== '' ? 'Taybah/1.0 (+mailto:'.$email.')' : 'Taybah/1.0';
    }
}
