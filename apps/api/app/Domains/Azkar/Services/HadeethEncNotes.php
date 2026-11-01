<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Services;

/**
 * Builds the HadeethEnc notes for the entries of the primary source (ADR 0031 §12, step-13 §4).
 *
 * - explanation ← explanation; grade ← grade (grader null: the API gives none); reference ← attribution.
 * - «الفوائد» (hints) is never read into a note.
 * - Production uses reviewed links only. Other environments also use candidate links, and each one is reported.
 * - The text is the API's, byte for byte. Nothing is translated or generated.
 */
final class HadeethEncNotes
{
    public const string SOURCE_NAME = 'موسوعة الأحاديث النبوية (HadeethEnc.com)';

    /**
     * @param  array<string, list<array<string, int|string>>>  $links  The reviewed and candidate links, by entry key.
     * @param  array<int, array<string, mixed>>  $records  The verified hadith records, by id.
     * @return array{notes: array<string, list<array<string, int|string|null>>>, candidates: list<string>, missing: list<string>, stats: array<string, int>}
     */
    public function build(array $links, array $records, bool $production): array
    {
        $siteUrl = (string) config('azkar.hadeethenc.site_url');
        $notes = [];
        $candidates = [];
        $missing = [];
        $stats = ['entries_enriched' => 0, 'links_reviewed' => 0, 'links_candidate' => 0, 'explanation' => 0, 'grade' => 0, 'reference' => 0];

        foreach ($links as $entryKey => $entryLinks) {
            $entryNotes = [];

            foreach ($entryLinks as $link) {
                $status = (string) ($link['status'] ?? '');
                $id = (int) ($link['hadeeth_id'] ?? 0);

                if ($status === 'candidate' && $production) {
                    continue;
                }

                if (! in_array($status, ['reviewed', 'candidate'], true)) {
                    continue;
                }

                $record = $records[$id] ?? null;

                if (! is_array($record)) {
                    $missing[] = $entryKey.' → '.$id;

                    continue;
                }

                if ($status === 'candidate') {
                    $candidates[] = $entryKey.' → '.$id;
                    $stats['links_candidate']++;
                } else {
                    $stats['links_reviewed']++;
                }

                $source = [
                    'source_type' => 'hadeethenc',
                    'source_name' => self::SOURCE_NAME,
                    'source_reference' => (string) $id,
                    'source_url' => $siteUrl.$id,
                    'review_status' => $status,
                    'item_id' => null,
                ];

                foreach (['explanation' => 'explanation', 'grade' => 'grade', 'reference' => 'attribution'] as $kind => $field) {
                    $value = $record[$field] ?? null;

                    if (! is_string($value) || trim($value) === '') {
                        continue;
                    }

                    $entryNotes[] = ['kind' => $kind, 'text_ar' => $value, 'text_en' => null, 'grader' => null] + $source;
                    $stats[$kind]++;
                }
            }

            if ($entryNotes !== []) {
                $notes[$entryKey] = $entryNotes;
                $stats['entries_enriched']++;
            }
        }

        return ['notes' => $notes, 'candidates' => $candidates, 'missing' => $missing, 'stats' => $stats];
    }
}
