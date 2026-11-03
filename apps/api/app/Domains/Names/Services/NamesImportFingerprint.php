<?php

declare(strict_types=1);

namespace App\Domains\Names\Services;

/**
 * Content fingerprint for a Names import (ADR 0043 A2). Identical reviewed bytes must not bump the resource version.
 */
final class NamesImportFingerprint
{
    /**
     * @param  array<string, mixed>  $list
     * @param  list<array<string, mixed>>  $names
     * @param  list<array<string, mixed>>  $verses
     * @param  list<array<string, mixed>>  $notes
     */
    public function of(string $sourceSha256, array $list, array $names, array $verses, array $notes): string
    {
        $payload = [
            'source_sha256' => $sourceSha256,
            'list' => $list,
            'names' => $names,
            'verses' => $verses,
            'notes' => $notes,
        ];

        return hash('sha256', json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }
}
