<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Validation;

use App\Domains\Azkar\Data\FlatItem;
use App\Domains\Azkar\Data\ImportIssue;
use App\Domains\Azkar\OpenDua\StepFlattener;
use App\Domains\Azkar\Services\QuranReferencePolicy;
use App\Domains\Azkar\Services\QuranSegmenter;
use App\Domains\Azkar\Sources\SourceProfile;

/**
 * Collects every problem in a decoded catalogue. It never stops at the first one (ADR 0031 §3).
 * Errors fail the import; warnings are listed and the import continues.
 */
final class CatalogueValidator
{
    private const string HTML_TAG = '/<\/?[A-Za-z!][^<>]*>/';

    private const string CONTROL_CHARACTER = '/[\x{200B}-\x{200F}\x{202A}-\x{202E}\x{2066}-\x{2069}]/u';

    private const array ENTRY_TYPES = ['invocation', 'instruction', 'narration'];

    /**
     * @var array<int, string>
     */
    private array $entryKeys = [];

    public function __construct(
        private readonly StepFlattener $flattener,
        private readonly QuranSegmenter $segmenter,
        private readonly QuranReferencePolicy $references,
    ) {}

    /**
     * @param  array<string, mixed>  $catalogue
     * @return list<ImportIssue>
     */
    public function validate(array $catalogue, SourceProfile $profile): array
    {
        $issues = [];

        foreach (['collections', 'chapters', 'entries', 'duas', 'reciters', 'tags'] as $key) {
            if (! isset($catalogue[$key]) || ! is_array($catalogue[$key]) || ! array_is_list($catalogue[$key])) {
                return [new ImportIssue(ImportIssue::ERROR, 'invalid_structure', $key)];
            }
        }

        $counts = $catalogue['counts'] ?? null;

        if (! is_array($counts) || ! is_int($counts['chapters'] ?? null) || ! is_int($counts['entries'] ?? null) || ! is_int($counts['duas'] ?? null) || ! is_int($counts['recordings'] ?? null)) {
            return [new ImportIssue(ImportIssue::ERROR, 'invalid_structure', 'counts')];
        }

        if (($catalogue['dataVersion'] ?? null) !== $profile->version) {
            $issues[] = new ImportIssue(ImportIssue::ERROR, 'version_mismatch', 'dataVersion');
        }

        $collectionId = $profile->collectionId;
        $entries = $catalogue['entries'];
        $this->entryKeys = $this->keysByIndex($entries, $collectionId);

        [$chapterNumberById, $chapterIssues] = $this->chapters($catalogue['chapters']);
        $issues = [...$issues, ...$chapterIssues];

        [$tagIds, $tagIssues] = $this->tags($catalogue['tags']);
        $issues = [...$issues, ...$tagIssues];

        $reciterIds = $this->reciters($catalogue['reciters']);
        $issues = [...$issues, ...$this->duas($catalogue['duas'])];

        [$entryIssues, $recordingIds, $arabicEntries] = $this->entries(
            $entries,
            $collectionId,
            $chapterNumberById,
            $tagIds,
            $reciterIds,
        );
        $issues = [...$issues, ...$entryIssues];

        $issues = [...$issues, ...$this->counts($counts, $catalogue, count(array_unique(array_filter($recordingIds, fn (string $id): bool => $id !== ''))))];
        $issues = [...$issues, ...$this->repeatedArabic($arabicEntries)];

        $textIssues = [];
        $this->scanText($catalogue, '', null, $textIssues);

        return [...$issues, ...$textIssues];
    }

    /**
     * @param  list<mixed>  $chapters
     * @return array{0: array<string, int>, 1: list<ImportIssue>}
     */
    private function chapters(array $chapters): array
    {
        $numberById = [];
        $seen = [];
        $issues = [];

        foreach ($chapters as $index => $chapter) {
            $path = 'chapters['.$index.']';

            if (! is_array($chapter) || ! is_string($chapter['id'] ?? null) || ! is_int($chapter['number'] ?? null) || ! is_string($chapter['title'] ?? null)) {
                $issues[] = new ImportIssue(ImportIssue::ERROR, 'invalid_structure', $path);

                continue;
            }

            $number = $chapter['number'];

            if (isset($seen[$number])) {
                $issues[] = new ImportIssue(ImportIssue::ERROR, 'duplicate_chapter', $path);
            }

            $seen[$number] = true;
            $numberById[$chapter['id']] = $number;

            if (! $this->hasArabicTitle($chapter, $number)) {
                $issues[] = new ImportIssue(ImportIssue::WARNING, 'chapter_without_arabic_title', $path);
            }
        }

        return [$numberById, $issues];
    }

    /**
     * @param  list<mixed>  $tags
     * @return array{0: array<string, true>, 1: list<ImportIssue>}
     */
    private function tags(array $tags): array
    {
        $ids = [];
        $issues = [];

        foreach ($tags as $index => $tag) {
            if (! is_array($tag) || ! is_string($tag['id'] ?? null) || $tag['id'] === '') {
                $issues[] = new ImportIssue(ImportIssue::ERROR, 'invalid_structure', 'tags['.$index.']');

                continue;
            }

            $ids[$tag['id']] = true;
        }

        return [$ids, $issues];
    }

    /**
     * @param  list<mixed>  $reciters
     * @return array<string, true>
     */
    private function reciters(array $reciters): array
    {
        $ids = [];

        foreach ($reciters as $reciter) {
            if (is_array($reciter) && is_string($reciter['id'] ?? null)) {
                $ids[$reciter['id']] = true;
            }
        }

        return $ids;
    }

    /**
     * @param  list<mixed>  $duas
     * @return list<ImportIssue>
     */
    private function duas(array $duas): array
    {
        $issues = [];

        foreach ($duas as $index => $dua) {
            $path = 'duas['.$index.']';

            if (! is_array($dua)) {
                $issues[] = new ImportIssue(ImportIssue::ERROR, 'invalid_structure', $path);

                continue;
            }

            if (array_key_exists('placeholders', $dua)) {
                $issues[] = new ImportIssue(ImportIssue::WARNING, 'dua_placeholders', $path);
            }
        }

        return $issues;
    }

    /**
     * @param  list<mixed>  $entries
     * @param  array<string, int>  $chapterNumberById
     * @param  array<string, true>  $tagIds
     * @param  array<string, true>  $reciterIds
     * @return array{0: list<ImportIssue>, 1: list<string>, 2: array<string, array<string, true>>}
     */
    private function entries(array $entries, string $collectionId, array $chapterNumberById, array $tagIds, array $reciterIds): array
    {
        $issues = [];
        $recordingIds = [];
        $arabicEntries = [];

        foreach ($entries as $index => $entry) {
            $path = 'entries['.$index.']';

            if (! is_array($entry)) {
                $issues[] = $this->issue('invalid_structure', $path, $index);

                continue;
            }

            $id = $entry['id'] ?? null;

            if (! is_string($id) || $id === '') {
                $issues[] = $this->issue('missing_entry_id', $path, $index);

                continue;
            }

            if (($entry['collectionId'] ?? null) !== $collectionId) {
                $issues[] = $this->issue('unknown_collection', $path, $index);
            }

            if ($this->duplicateEntryId($entries, $id)) {
                $issues[] = $this->issue('duplicate_entry_id', $path, $index);
            }

            $chapterId = $entry['chapterId'] ?? null;

            if (! is_string($chapterId) || ! isset($chapterNumberById[$chapterId])) {
                $issues[] = $this->issue('unknown_chapter', $path, $index);
            }

            if (! in_array($entry['type'] ?? null, self::ENTRY_TYPES, true)) {
                $issues[] = $this->issue('invalid_entry_type', $path, $index);
            }

            if (! is_string($entry['sourceReference'] ?? null) || ! is_string($entry['title'] ?? null)) {
                $issues[] = $this->issue('invalid_structure', $path, $index);
            }

            $tags = $entry['tags'] ?? null;

            if (! is_array($tags) || ! array_is_list($tags)) {
                $issues[] = $this->issue('invalid_structure', $path, $index);
            } else {
                foreach ($tags as $tag) {
                    if (! is_string($tag) || ! isset($tagIds[$tag])) {
                        $issues[] = $this->issue('unknown_tag', $path, $index);
                    }
                }
            }

            $variations = $this->flattener->variationsOf($entry);

            if ($variations === null) {
                $neither = ! array_key_exists('steps', $entry) && ! array_key_exists('variations', $entry);
                $issues[] = $this->issue($neither ? 'entry_without_steps' : 'invalid_structure', $path, $index);

                continue;
            }

            $entryKey = $this->entryKeys[$index] ?? $collectionId.':'.$id;

            foreach ($variations as $variation) {
                $flat = $this->flattener->flatten($entryKey, $index, $variation['id'], $variation['steps']);
                $recordingIds = [...$recordingIds, ...$flat->recordingIds];

                foreach ($flat->issues as $flatIssue) {
                    $issues[] = $flatIssue;
                }

                foreach ($flat->items as $item) {
                    $issues = [...$issues, ...$this->quranIssues($item)];
                    $this->reciterIssues($item, $reciterIds, $issues);

                    // ADR 0031 warning: the same dua text in more than one entry. Instruction text is not counted.
                    if ($item->textAr !== null && $item->kind === 'recitation') {
                        $arabicEntries[hash('sha256', $item->textAr)][$entryKey] = true;
                    }
                }
            }
        }

        return [$issues, $recordingIds, $arabicEntries];
    }

    /**
     * ADR 0031 §4 and §11: every ﴿…﴾ span needs one map row, in span order. Each row's status decides whether the
     * import may use it: reviewed rows always, candidate rows outside production (listed as warnings), and
     * unmatched rows never.
     *
     * @return list<ImportIssue>
     */
    private function quranIssues(FlatItem $item): array
    {
        if ($item->textAr === null) {
            return [];
        }

        $scan = $this->segmenter->scan($item->textAr);
        $path = 'item:'.$item->itemKey;

        if (! $scan['balanced']) {
            return [new ImportIssue(ImportIssue::ERROR, 'unbalanced_quran_marks', $path, $item->entryIndex, $item->entryKey)];
        }

        if ($scan['spans'] === 0) {
            return [];
        }

        $map = config('azkar.quran_references', []);
        $references = is_array($map) ? ($map[$item->itemKey] ?? null) : null;

        if ($references === null) {
            return [new ImportIssue(ImportIssue::ERROR, 'quran_reference_unreviewed', $path, $item->entryIndex, $item->entryKey)];
        }

        $rows = $this->parsedReferences($references);

        if ($rows === null) {
            return [new ImportIssue(ImportIssue::ERROR, 'invalid_quran_reference', $path, $item->entryIndex, $item->entryKey)];
        }

        if (count($rows) !== $scan['spans']) {
            return [new ImportIssue(ImportIssue::ERROR, 'quran_reference_unreviewed', $path, $item->entryIndex, $item->entryKey)];
        }

        $issues = [];

        foreach ($rows as $index => $row) {
            $spanPath = $path.'#'.($index + 1);

            $issues[] = match ($this->references->decide($row)) {
                QuranReferencePolicy::DECISION_ACCEPT => null,
                QuranReferencePolicy::DECISION_WARN_CANDIDATE => new ImportIssue(ImportIssue::WARNING, 'quran_reference_candidate', $spanPath, $item->entryIndex, $item->entryKey),
                QuranReferencePolicy::DECISION_BLOCK => new ImportIssue(ImportIssue::ERROR, 'quran_reference_unreviewed', $spanPath, $item->entryIndex, $item->entryKey),
                default => new ImportIssue(ImportIssue::ERROR, 'invalid_quran_reference', $spanPath, $item->entryIndex, $item->entryKey),
            };
        }

        return array_values(array_filter($issues, static fn (?ImportIssue $issue): bool => $issue !== null));
    }

    /**
     * @param  array<string, true>  $reciterIds
     * @param  list<ImportIssue>  $issues
     */
    private function reciterIssues(FlatItem $item, array $reciterIds, array &$issues): void
    {
        foreach ($item->recordings as $recording) {
            if (! isset($reciterIds[$recording['reciterId']])) {
                $issues[] = new ImportIssue(ImportIssue::ERROR, 'unknown_reciter', 'item:'.$item->itemKey, $item->entryIndex, $item->entryKey);
            }
        }
    }

    /**
     * @param  array<string, mixed>  $counts
     * @param  array<string, mixed>  $catalogue
     * @return list<ImportIssue>
     */
    private function counts(array $counts, array $catalogue, int $uniqueRecordings): array
    {
        $actual = [
            'chapters' => count($catalogue['chapters']),
            'entries' => count($catalogue['entries']),
            'duas' => count($catalogue['duas']),
            'recordings' => $uniqueRecordings,
        ];
        $issues = [];

        foreach ($actual as $key => $value) {
            if ($counts[$key] !== $value) {
                $issues[] = new ImportIssue(ImportIssue::ERROR, 'count_mismatch', 'counts.'.$key);
            }
        }

        return $issues;
    }

    /**
     * @param  array<string, array<string, true>>  $arabicEntries
     * @return list<ImportIssue>
     */
    private function repeatedArabic(array $arabicEntries): array
    {
        $issues = [];

        foreach ($arabicEntries as $hash => $entryKeys) {
            if (count($entryKeys) > 1) {
                $issues[] = new ImportIssue(ImportIssue::WARNING, 'repeated_arabic', 'arabic:'.substr($hash, 0, 12));
            }
        }

        return $issues;
    }

    /**
     * Every string in the catalogue is checked for HTML tags and bidi or zero-width controls.
     *
     * @param  list<ImportIssue>  $issues
     */
    private function scanText(mixed $value, string $path, ?int $entryIndex, array &$issues): void
    {
        if (is_string($value)) {
            $key = $entryIndex === null ? null : ($this->entryKeys[$entryIndex] ?? null);

            if (preg_match(self::HTML_TAG, $value) === 1) {
                $issues[] = new ImportIssue(ImportIssue::ERROR, 'html_in_text', $path, $entryIndex, $key);
            }

            if (preg_match(self::CONTROL_CHARACTER, $value) === 1) {
                $issues[] = new ImportIssue(ImportIssue::ERROR, 'control_character', $path, $entryIndex, $key);
            }

            return;
        }

        if (! is_array($value)) {
            return;
        }

        foreach ($value as $key => $child) {
            $childPath = $path === '' ? (string) $key : $path.'.'.$key;
            $childIndex = $entryIndex;

            if ($path === 'entries' && is_int($key)) {
                $childIndex = $key;
            }

            $this->scanText($child, $childPath, $childIndex, $issues);
        }
    }

    /**
     * @param  list<mixed>  $entries
     * @return array<int, string>
     */
    private function keysByIndex(array $entries, string $collectionId): array
    {
        $keys = [];

        foreach ($entries as $index => $entry) {
            if (is_array($entry) && is_string($entry['id'] ?? null) && $entry['id'] !== '') {
                $keys[$index] = $collectionId.':'.$entry['id'];
            }
        }

        return $keys;
    }

    /**
     * @param  list<mixed>  $entries
     */
    private function duplicateEntryId(array $entries, string $id): bool
    {
        $count = 0;

        foreach ($entries as $entry) {
            if (is_array($entry) && ($entry['id'] ?? null) === $id) {
                $count++;
            }
        }

        return $count > 1;
    }

    /**
     * @return list<array{surah: int|null, from: int|null, to: int|null, status: string, evidence: string|null}>|null
     */
    private function parsedReferences(mixed $references): ?array
    {
        if (! is_array($references) || ! array_is_list($references) || $references === []) {
            return null;
        }

        $rows = [];

        foreach ($references as $reference) {
            $row = $this->references->parse($reference);

            if ($row === null) {
                return null;
            }

            $rows[] = $row;
        }

        return $rows;
    }

    /**
     * A chapter's own Arabic title (from its source) wins; otherwise the reviewed config map (ADR 0031 §1).
     *
     * @param  array<array-key, mixed>  $chapter
     */
    private function hasArabicTitle(array $chapter, int $number): bool
    {
        if (is_string($chapter['titleAr'] ?? null) && $chapter['titleAr'] !== '') {
            return true;
        }

        $titles = config('azkar.chapter_titles_ar', []);

        return is_array($titles) && is_string($titles[$number] ?? null) && $titles[$number] !== '';
    }

    private function issue(string $code, string $path, int $index): ImportIssue
    {
        return new ImportIssue(ImportIssue::ERROR, $code, $path, $index, $this->entryKeys[$index] ?? null);
    }
}
