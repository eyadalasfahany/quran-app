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
 * Fetches the hisnmuslim.com index and every chapter file, sequentially and politely, and writes them with a manifest
 * (ADR 0031 §12). The bytes are stored exactly as received, byte order mark included; the BOM is removed only when a
 * file is decoded. The manifest's whole-file SHA-256 is the pin an import will verify against.
 */
final class HisnMuslimSnapshotter
{
    private const string INDEX_KEY = 'العربية';

    /**
     * @return array{directory: string, chapters: int, entries: int, manifest_sha256: string, files: int}
     *
     * @throws SnapshotException
     */
    public function take(string $date): array
    {
        $indexUrl = (string) config('azkar.hisnmuslim.index_url');
        $index = $this->fetch($indexUrl);
        $chapters = $this->decode($index)[self::INDEX_KEY] ?? null;

        if (! is_array($chapters) || ! array_is_list($chapters) || $chapters === []) {
            throw new SnapshotException('The hisnmuslim index does not list chapters under the expected key.');
        }

        $files = ['index.json' => $index];
        $entries = 0;

        foreach ($chapters as $chapter) {
            $id = is_array($chapter) ? ($chapter['ID'] ?? null) : null;

            if (! is_int($id) || $id < 1) {
                throw new SnapshotException('The hisnmuslim index holds a chapter without a numeric ID.');
            }

            $this->pause();
            $bytes = $this->fetch(str_replace('{id}', (string) $id, (string) config('azkar.hisnmuslim.chapter_url')));
            $data = $this->decode($bytes);
            $list = array_values($data)[0] ?? null;

            if (count($data) !== 1 || ! is_array($list) || ! array_is_list($list)) {
                throw new SnapshotException('Chapter file ['.$id.'] does not hold one title with a list of entries.');
            }

            $entries += count($list);
            $files[$id.'.json'] = $bytes;
        }

        $directory = SourceCache::path('azkar/hisnmuslim/'.$date);
        File::ensureDirectoryExists($directory);

        $hashes = [];

        foreach ($files as $name => $bytes) {
            File::put($directory.DIRECTORY_SEPARATOR.$name, $bytes);
            $hashes[$name] = hash('sha256', $bytes);
        }

        ksort($hashes);
        $manifestSha = hash('sha256', (string) json_encode($hashes, JSON_THROW_ON_ERROR));

        File::put($directory.DIRECTORY_SEPARATOR.'manifest.json', (string) json_encode([
            'source' => 'hisnmuslim',
            'date' => $date,
            'index_url' => $indexUrl,
            'chapter_count' => count($chapters),
            'entry_count' => $entries,
            'files' => $hashes,
            'sha256' => $manifestSha,
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));

        return [
            'directory' => $directory,
            'chapters' => count($chapters),
            'entries' => $entries,
            'manifest_sha256' => $manifestSha,
            'files' => count($files),
        ];
    }

    /**
     * Retries connection failures, 429 and 5xx with a fixed delay. Other client errors fail at once.
     *
     * @throws SnapshotException
     */
    private function fetch(string $url): string
    {
        try {
            $response = Http::withUserAgent($this->userAgent())
                ->timeout(60)
                ->retry(
                    3,
                    (int) config('azkar.hisnmuslim.retry_delay_ms', 1000),
                    fn (\Throwable $exception): bool => $exception instanceof ConnectionException
                        || ($exception instanceof RequestException && ($exception->response->status() === 429 || $exception->response->status() >= 500)),
                )
                ->get($url)
                ->throw();
        } catch (ConnectionException|RequestException) {
            throw new SnapshotException('The hisnmuslim source did not answer a request; nothing was written.');
        }

        return $response->body();
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
            throw new SnapshotException('A hisnmuslim file is not valid UTF-8 JSON.');
        }

        if (! is_array($data)) {
            throw new SnapshotException('A hisnmuslim file does not hold a JSON object.');
        }

        return $data;
    }

    private function pause(): void
    {
        $gap = (int) config('azkar.hisnmuslim.gap_ms', 300);

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
