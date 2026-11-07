<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Services;

use App\Domains\Hadith\Import\Records\HadithImportPlan;
use App\Domains\Hadith\Import\Records\IntegrityResult;
use App\Domains\Hadith\Repositories\Contracts\HadithImportRepository;

/**
 * Compares stored rows with the plan's hashes: an altered text, a text that differs from the source hash, a missing row and
 * an extra row all fail. Keys are kept (at most 20), never text.
 */
final class HadithTextIntegrityChecker
{
    private const int FIRST_KEYS = 20;

    public function __construct(private readonly HadithImportRepository $repository) {}

    public function checkAgainstPlan(int $resourceId, HadithImportPlan $plan): IntegrityResult
    {
        $expected = [];

        foreach ($plan->entries as $entry) {
            // Placeholder rows (unavailable, ADR 0076 rule amended 7 Nov 2026) carry no text: they are skipped on both sides.
            if ($entry['source_code'] === 'unavailable') {
                continue;
            }

            $expected[(string) $entry['source_key']] = (string) $entry['source_text_sha256'];
        }

        $expectedCount = count($expected);
        $stored = 0;
        $extra = 0;
        $storedHashMismatches = 0;
        $sourceMismatches = 0;
        $firstKeys = [];

        foreach ($this->repository->entryTexts($resourceId) as $row) {
            $key = $row['source_key'];

            if (str_starts_with($key, 'unavailable:')) {
                continue;
            }

            $stored++;

            if (! array_key_exists($key, $expected)) {
                $extra++;
                $this->remember($firstKeys, $key);

                continue;
            }

            if (! hash_equals($row['source_text_sha256'], hash('sha256', $row['text_ar']))) {
                $storedHashMismatches++;
                $this->remember($firstKeys, $key);
            }

            if (! hash_equals($expected[$key], $row['source_text_sha256'])) {
                $sourceMismatches++;
                $this->remember($firstKeys, $key);
            }

            unset($expected[$key]);
        }

        $missingKeys = array_keys($expected);

        foreach ($missingKeys as $key) {
            $this->remember($firstKeys, (string) $key);
        }

        return new IntegrityResult(
            expected: $expectedCount,
            stored: $stored,
            storedHashMismatches: $storedHashMismatches,
            sourceMismatches: $sourceMismatches,
            missing: count($missingKeys),
            extra: $extra,
            firstKeys: $firstKeys,
        );
    }

    /**
     * @param  list<string>  $firstKeys
     */
    private function remember(array &$firstKeys, string $key): void
    {
        if (count($firstKeys) < self::FIRST_KEYS && ! in_array($key, $firstKeys, true)) {
            $firstKeys[] = $key;
        }
    }
}
