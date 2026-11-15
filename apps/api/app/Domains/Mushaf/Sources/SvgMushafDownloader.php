<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Sources;

use App\Domains\Mushaf\Exceptions\SvgMushafSourceException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use JsonException;

/**
 * Serves one pinned quran-svg file: from the cache when it passes check A1, otherwise downloaded, checked and cached (ADR 0090
 * decision 7). Nothing is written unless it passes A1, and only one file is held in memory at a time.
 */
final class SvgMushafDownloader
{
    private const int TIMEOUT_SECONDS = 60;

    private const int CONNECT_TIMEOUT_SECONDS = 10;

    /** @var array<string, mixed>|null */
    private ?array $manifest = null;

    public function __construct(private readonly SvgMushafStore $store) {}

    /**
     * The git blob SHA-1 of the bytes, as the manifest records it (the same as `git hash-object`).
     */
    public static function blobSha(string $bytes): string
    {
        return hash('sha1', 'blob '.strlen($bytes)."\0".$bytes);
    }

    /**
     * The file's bytes. With $offline, only a cached copy that passes A1 is used.
     *
     * @throws SvgMushafSourceException
     */
    public function bytes(string $folder, string $relative, bool $offline): string
    {
        $pin = $this->pin($folder, $relative);
        $base = $this->base($folder);

        if ($this->store->has($base, $relative)) {
            $cached = $this->store->read($base, $relative);

            if ($this->passesA1($pin, $cached)) {
                return $cached;
            }

            $this->store->delete($base, $relative);
        }

        if ($offline) {
            throw new SvgMushafSourceException('No verified cached copy of ['.$relative.'] for ['.$folder.']. Run the import without --offline first.');
        }

        $bytes = $this->download($base, $relative);

        if (! $this->passesA1($pin, $bytes)) {
            throw new SvgMushafSourceException('The downloaded ['.$base.'/'.$relative.'] does not match its pinned size and blob SHA.');
        }

        $this->store->write($base, $relative, $bytes);

        return $bytes;
    }

    /**
     * The manifest's pin for one file: its blob SHA and size.
     *
     * @return array{sha: string, bytes: int}
     *
     * @throws SvgMushafSourceException when the file is not in the manifest
     */
    public function pin(string $folder, string $relative): array
    {
        $edition = $this->edition($folder);

        if ($relative === 'json/surah.json') {
            return $this->pinOf($edition['surah'] ?? null, $relative);
        }

        if (preg_match('#^(svg|json)/(\d{3})\.(svg|json)$#', $relative, $matches) !== 1 || $matches[1] !== $matches[3]) {
            throw new SvgMushafSourceException('The file ['.$relative.'] is not in the manifest.');
        }

        $index = (int) $matches[2] - 1;
        $entry = $edition['pages'][$index] ?? null;

        if (! is_array($entry) || count($entry) !== 4) {
            throw new SvgMushafSourceException('The page ['.$matches[2].'] of ['.$folder.'] is not in the manifest.');
        }

        return $matches[1] === 'svg'
            ? $this->pinOf([$entry[0], $entry[1]], $relative)
            : $this->pinOf([$entry[2], $entry[3]], $relative);
    }

    /**
     * The edition's base folder in the repository, for example `mushafs/hafs/kfqc`.
     */
    public function base(string $folder): string
    {
        return (string) $this->edition($folder)['base'];
    }

    /**
     * @param  array{sha: string, bytes: int}  $pin
     */
    private function passesA1(array $pin, string $bytes): bool
    {
        return strlen($bytes) === $pin['bytes'] && hash_equals($pin['sha'], self::blobSha($bytes));
    }

    private function download(string $base, string $relative): string
    {
        $url = (string) config('mushaf.raw_base').'/'.(string) config('mushaf.commit').'/'.$base.'/'.$relative;

        try {
            $response = Http::withUserAgent('Taybah/1.0')
                ->timeout(self::TIMEOUT_SECONDS)
                ->connectTimeout(self::CONNECT_TIMEOUT_SECONDS)
                ->get($url);
        } catch (ConnectionException) {
            throw new SvgMushafSourceException('The source could not be reached for ['.$relative.'].');
        }

        if ($response->status() !== 200) {
            throw new SvgMushafSourceException('The source answered HTTP '.$response->status().' for ['.$base.'/'.$relative.'].');
        }

        return $response->body();
    }

    /**
     * @param  mixed  $pin  The manifest's [blob_sha, bytes] pair.
     * @return array{sha: string, bytes: int}
     */
    private function pinOf(mixed $pin, string $relative): array
    {
        if (! is_array($pin) || count($pin) !== 2 || ! is_string($pin[0]) || ! is_int($pin[1])) {
            throw new SvgMushafSourceException('The manifest has no usable pin for ['.$relative.'].');
        }

        return ['sha' => $pin[0], 'bytes' => $pin[1]];
    }

    /**
     * @return array<string, mixed>
     *
     * @throws SvgMushafSourceException
     */
    private function edition(string $folder): array
    {
        $editions = $this->manifest()['editions'] ?? null;
        $edition = is_array($editions) ? ($editions[$folder] ?? null) : null;

        if (! is_array($edition) || ! is_string($edition['base'] ?? null)) {
            throw new SvgMushafSourceException('The edition ['.$folder.'] is not in the manifest.');
        }

        return $edition;
    }

    /**
     * @return array<string, mixed>
     *
     * @throws SvgMushafSourceException
     */
    private function manifest(): array
    {
        if ($this->manifest !== null) {
            return $this->manifest;
        }

        $path = resource_path((string) config('mushaf.manifest'));

        if (! is_file($path)) {
            throw new SvgMushafSourceException('The pinned manifest is missing: '.(string) config('mushaf.manifest').'.');
        }

        try {
            $decoded = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new SvgMushafSourceException('The pinned manifest is not valid JSON.');
        }

        if (! is_array($decoded) || ($decoded['commit'] ?? null) !== config('mushaf.commit')) {
            throw new SvgMushafSourceException('The pinned manifest does not match config/mushaf.php.');
        }

        return $this->manifest = $decoded;
    }
}
