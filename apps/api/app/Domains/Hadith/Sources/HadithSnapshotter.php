<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Sources;

use App\Domains\Hadith\Exceptions\HadithPinException;
use App\Domains\Hadith\Exceptions\HadithSourceFormatException;
use App\Domains\Hadith\Sources\Records\SnapshotFileResult;
use App\Integrations\HadithApiFawaz\HadithApiFawazClient;
use App\Integrations\HadithApiFawaz\HadithApiFawazException;

/**
 * The download loop behind hadith:snapshot (ADR 0042 §4). Verified mode trusts only pins that match; record mode fetches
 * everything without a pin check and reports each hash. Record mode writes unverified bytes into the cache; that is safe
 * because every reader goes through FawazHadithSource::bytes(), which re-hashes and deletes a mismatch (ADR 0068 §2).
 */
final class HadithSnapshotter
{
    private const string EDITIONS = 'editions.json';

    public function __construct(
        private readonly HadithApiFawazClient $client,
        private readonly PinnedFileVerifier $verifier,
        private readonly SnapshotStore $store,
        private readonly FawazHadithSource $source,
    ) {}

    /**
     * @return list<SnapshotFileResult> In config order.
     *
     * @throws HadithPinException
     * @throws HadithSourceFormatException
     * @throws HadithApiFawazException
     */
    public function take(bool $record): array
    {
        if (! $record) {
            $this->verifier->assertAllRecorded();
        }

        $paths = $this->verifier->paths();
        $results = [];

        [$status, $editions] = $this->obtain(self::EDITIONS, $record);
        $results[self::EDITIONS] = $this->result(self::EDITIONS, $editions, $status);
        $this->assertEditionNames($editions);

        foreach ($paths as $path) {
            if ($path === self::EDITIONS) {
                continue;
            }

            $this->pause();
            [$status, $bytes] = $this->obtain($path, $record);
            $results[$path] = $this->result($path, $bytes, $status);
        }

        return array_map(fn (string $path): SnapshotFileResult => $results[$path], $paths);
    }

    /**
     * @return array{string, string} The status and the bytes.
     */
    private function obtain(string $path, bool $record): array
    {
        if ($record) {
            $bytes = $this->client->fetch($path);
            $this->store->write($path, $bytes);

            return [$this->recordStatus($path, $bytes), $bytes];
        }

        if ($this->store->has($path)) {
            $cached = $this->store->read($path);

            if ($this->verifier->matches($path, $cached)) {
                return ['cached', $cached];
            }

            $this->store->delete($path);
        }

        $bytes = $this->client->fetch($path);
        $this->verifier->verify($path, $bytes);
        $this->store->write($path, $bytes);

        return ['verified', $bytes];
    }

    private function recordStatus(string $path, string $bytes): string
    {
        $pin = $this->verifier->expected($path);

        if ($pin === null) {
            return 'new';
        }

        return hash_equals($pin, hash('sha256', $bytes)) ? 'same' : 'DIFFERS';
    }

    /**
     * Every canonical slug's ara-{sourceSlug} edition must be listed in editions.json. Every difference is reported at once,
     * and nothing else is downloaded after a difference.
     *
     * @throws HadithSourceFormatException
     */
    private function assertEditionNames(string $editionsBytes): void
    {
        $names = $this->source->editionNamesFrom($editionsBytes);
        $differences = [];

        foreach ($this->source->slugs() as $slug) {
            $sourceSlug = $this->source->sourceSlug($slug);
            $edition = 'ara-'.$sourceSlug;

            if (! in_array($edition, $names[$sourceSlug] ?? [], true)) {
                $differences[] = '['.$sourceSlug.'] edition ['.$edition.'] is not listed in editions.json';
            }
        }

        if ($differences !== []) {
            throw new HadithSourceFormatException(implode("\n", $differences));
        }
    }

    private function result(string $path, string $bytes, string $status): SnapshotFileResult
    {
        return new SnapshotFileResult(
            path: $path,
            bytes: strlen($bytes),
            sha256: hash('sha256', $bytes),
            status: $status,
        );
    }

    /**
     * Pauses between two downloads (config hadith.download.gap_ms).
     */
    private function pause(): void
    {
        $gap = (int) config('hadith.download.gap_ms', 300);

        if ($gap > 0) {
            usleep($gap * 1000);
        }
    }
}
