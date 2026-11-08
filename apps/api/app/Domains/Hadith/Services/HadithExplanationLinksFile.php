<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Services;

use App\Domains\Hadith\Exceptions\HadithExplanationException;

/**
 * ADR 0078 step 3: the text-free links file (database/data/hadith/explanations/hadeethenc.json). Ids, numbers, evidence
 * counts and the pinned snapshot hash only; no hadith or explanation text. Encoding is deterministic, so a rerun with the
 * same inputs gives the same bytes and the same SHA-256.
 */
final class HadithExplanationLinksFile
{
    public const int SCHEMA = 1;

    private const array LINK_KEYS = ['collection', 'number', 'explanation_id', 'status', 'evidence'];

    /**
     * @param  list<array{collection: string, number: string, explanation_id: int, status: string, evidence: string}>  $links
     * @param  array{min_containment_percent: int, min_gap_percent: int}  $thresholds
     */
    public function encode(string $snapshotSha256, array $thresholds, array $links): string
    {
        $order = array_flip(array_values((array) config('hadith.collections', [])));

        usort($links, static function (array $first, array $second) use ($order): int {
            $byCollection = ($order[$first['collection']] ?? PHP_INT_MAX) <=> ($order[$second['collection']] ?? PHP_INT_MAX);

            return $byCollection !== 0 ? $byCollection
                : (strnatcmp($first['number'], $second['number']) ?: $first['explanation_id'] <=> $second['explanation_id']);
        });

        $document = [
            'schema' => self::SCHEMA,
            'source' => 'hadeethenc',
            'snapshot_sha256' => $snapshotSha256,
            'thresholds' => $thresholds,
            'links' => $links,
        ];

        return json_encode($document, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)."\n";
    }

    /**
     * @return array{snapshot_sha256: string, links: list<array{collection: string, number: string, explanation_id: int, status: string, evidence: string}>}
     *
     * @throws HadithExplanationException when the file does not match the schema
     */
    public function decode(string $bytes): array
    {
        try {
            $document = json_decode($bytes, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new HadithExplanationException('The explanation links file is not valid JSON.');
        }

        if (! is_array($document) || ($document['schema'] ?? null) !== self::SCHEMA || ($document['source'] ?? null) !== 'hadeethenc') {
            throw new HadithExplanationException('The explanation links file has an unknown schema or source.');
        }

        $sha = $document['snapshot_sha256'] ?? null;

        if (! is_string($sha) || preg_match('~^[0-9a-f]{64}$~', $sha) !== 1 || ! is_array($document['links'] ?? null)) {
            throw new HadithExplanationException('The explanation links file has no valid snapshot hash or link list.');
        }

        $seen = [];
        $links = [];

        foreach ($document['links'] as $link) {
            if (! is_array($link) || array_keys($link) !== self::LINK_KEYS) {
                throw new HadithExplanationException('An explanation link has keys outside the closed list.');
            }

            if (! is_string($link['collection']) || ! is_string($link['number']) || $link['number'] === ''
                || ! is_int($link['explanation_id']) || $link['explanation_id'] < 1
                || $link['status'] !== 'accepted' || ! is_string($link['evidence'])) {
                throw new HadithExplanationException('An explanation link has a value outside its type or status.');
            }

            $key = $link['collection'].'|'.$link['number'].'|'.$link['explanation_id'];

            if (isset($seen[$key])) {
                throw new HadithExplanationException('An explanation link is repeated.');
            }

            $seen[$key] = true;
            $links[] = $link;
        }

        return ['snapshot_sha256' => $sha, 'links' => $links];
    }
}
