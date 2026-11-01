<?php

declare(strict_types=1);

namespace App\Domains\Azkar\OpenDua;

use App\Domains\Azkar\Data\FlatItem;
use App\Domains\Azkar\Data\FlattenedVariation;
use App\Domains\Azkar\Data\ImportIssue;

/**
 * Flattens OpenDua steps into azkar items (ADR 0031 transformation rules). Malformed steps become issues and are
 * skipped, so one bad step never shifts the numbering of the valid ones. Used by both the validator and the transformer.
 */
final class StepFlattener
{
    private const array TEXT_TYPES = ['instruction', 'narration'];

    /**
     * An entry with variations, or with top-level steps that count as the single variation "standard".
     * Returns null when the shape is not valid.
     *
     * @param  array<array-key, mixed>  $entry
     * @return list<array{id: string, steps: list<mixed>}>|null
     */
    public function variationsOf(array $entry): ?array
    {
        $hasVariations = array_key_exists('variations', $entry);
        $hasSteps = array_key_exists('steps', $entry);

        if ($hasVariations === $hasSteps) {
            return null;
        }

        if ($hasSteps) {
            $steps = $entry['steps'];

            return is_array($steps) && $this->isNonEmptyList($steps) ? [['id' => 'standard', 'steps' => array_values($steps)]] : null;
        }

        $variations = $entry['variations'];

        if (! is_array($variations) || ! $this->isNonEmptyList($variations)) {
            return null;
        }

        $result = [];
        $seen = [];

        foreach ($variations as $variation) {
            if (! is_array($variation)) {
                return null;
            }

            $id = $variation['id'] ?? null;
            $steps = $variation['steps'] ?? null;

            if (! is_string($id) || $id === '' || isset($seen[$id]) || ! is_array($steps) || ! $this->isNonEmptyList($steps)) {
                return null;
            }

            $seen[$id] = true;
            $result[] = ['id' => $id, 'steps' => array_values($steps)];
        }

        return $result;
    }

    /**
     * @param  list<mixed>  $steps
     */
    public function flatten(string $entryKey, int $entryIndex, string $variationKey, array $steps): FlattenedVariation
    {
        $items = [];
        $issues = [];
        $recordingIds = [];
        $repeatGroups = 0;

        foreach ($steps as $stepIndex => $step) {
            $path = $entryKey.'/'.$variationKey.'/steps['.$stepIndex.']';

            if (! is_array($step)) {
                $issues[] = $this->error('invalid_structure', $path, $entryIndex, $entryKey);

                continue;
            }

            if (($step['type'] ?? null) === 'repeat') {
                $repeatGroups++;
                $times = $this->positiveInt($step, 'times');

                if ($times === null) {
                    $issues[] = $this->error('invalid_times', $path, $entryIndex, $entryKey);

                    continue;
                }

                $children = $step['steps'] ?? null;

                if (! is_array($children) || ! $this->isNonEmptyList($children)) {
                    $issues[] = $this->error('invalid_structure', $path, $entryIndex, $entryKey);

                    continue;
                }

                foreach ($children as $childIndex => $child) {
                    $childPath = $path.'/steps['.$childIndex.']';

                    if (! is_array($child) || ($child['type'] ?? null) === 'repeat') {
                        $issues[] = $this->error('nested_repeat', $childPath, $entryIndex, $entryKey);

                        continue;
                    }

                    $recordingIds = [...$recordingIds, ...$this->recordingIdsOf($child)];
                    $this->appendLeaf($child, $items, $issues, $entryKey, $entryIndex, $variationKey, $childPath, $repeatGroups, $times);
                }

                continue;
            }

            $recordingIds = [...$recordingIds, ...$this->recordingIdsOf($step)];
            $this->appendLeaf($step, $items, $issues, $entryKey, $entryIndex, $variationKey, $path, null, null);
        }

        return new FlattenedVariation(items: $items, issues: $issues, recordingIds: $recordingIds);
    }

    /**
     * @param  array<array-key, mixed>  $step
     * @param  list<FlatItem>  $items
     * @param  list<ImportIssue>  $issues
     */
    private function appendLeaf(
        array $step,
        array &$items,
        array &$issues,
        string $entryKey,
        int $entryIndex,
        string $variationKey,
        string $path,
        ?int $repeatGroup,
        ?int $repeatTimes,
    ): void {
        $type = $step['type'] ?? null;

        if (is_string($type) && in_array($type, self::TEXT_TYPES, true)) {
            $this->appendTextStep($step, $type, $items, $issues, $entryKey, $entryIndex, $variationKey, $path, $repeatGroup, $repeatTimes);

            return;
        }

        if ($type === 'recitation') {
            $this->appendRecitation($step, $items, $issues, $entryKey, $entryIndex, $variationKey, $path, $repeatGroup, $repeatTimes);

            return;
        }

        $issues[] = $this->error('unknown_step_type', $path, $entryIndex, $entryKey);
    }

    /**
     * @param  array<array-key, mixed>  $step
     * @param  list<FlatItem>  $items
     * @param  list<ImportIssue>  $issues
     */
    private function appendTextStep(
        array $step,
        string $type,
        array &$items,
        array &$issues,
        string $entryKey,
        int $entryIndex,
        string $variationKey,
        string $path,
        ?int $repeatGroup,
        ?int $repeatTimes,
    ): void {
        $text = $step['text'] ?? null;

        if (! is_string($text) || $text === '') {
            $issues[] = $this->error('missing_text', $path, $entryIndex, $entryKey);

            return;
        }

        $arabic = null;

        if (array_key_exists('arabic', $step)) {
            if (! is_string($step['arabic']) || $step['arabic'] === '') {
                $issues[] = $this->error('invalid_structure', $path, $entryIndex, $entryKey);

                return;
            }

            $arabic = $step['arabic'];
        }

        if ($arabic === null) {
            $issues[] = new ImportIssue(ImportIssue::WARNING, 'english_only_step', $path, $entryIndex, $entryKey);
        }

        $position = count($items) + 1;
        $items[] = new FlatItem(
            entryIndex: $entryIndex,
            entryKey: $entryKey,
            variationKey: $variationKey,
            itemKey: $entryKey.':'.$variationKey.':'.$position,
            position: $position,
            kind: $type,
            textAr: $arabic,
            textEn: $text,
            transliteration: null,
            speaker: is_string($step['speaker'] ?? null) ? $step['speaker'] : null,
            sourceDuaId: null,
            requiredCount: null,
            repeatGroup: $repeatGroup,
            repeatTimes: $repeatTimes,
            recordings: [],
        );
    }

    /**
     * @param  array<array-key, mixed>  $step
     * @param  list<FlatItem>  $items
     * @param  list<ImportIssue>  $issues
     */
    private function appendRecitation(
        array $step,
        array &$items,
        array &$issues,
        string $entryKey,
        int $entryIndex,
        string $variationKey,
        string $path,
        ?int $repeatGroup,
        ?int $repeatTimes,
    ): void {
        $rawItems = $step['items'] ?? null;

        if (! is_array($rawItems) || ! $this->isNonEmptyList($rawItems)) {
            $issues[] = $this->error('empty_recitation', $path, $entryIndex, $entryKey);

            return;
        }

        $speaker = is_string($step['speaker'] ?? null) ? $step['speaker'] : null;
        $recordings = $this->recordings($step, $path, $issues, $entryIndex, $entryKey);

        foreach ($rawItems as $itemIndex => $rawItem) {
            $itemPath = $path.'/items['.$itemIndex.']';
            $dua = is_array($rawItem) ? ($rawItem['dua'] ?? null) : null;

            if (! is_array($dua) || ! is_string($dua['id'] ?? null) || $dua['id'] === '') {
                $issues[] = $this->error('invalid_structure', $itemPath, $entryIndex, $entryKey);

                continue;
            }

            $arabic = $dua['arabic'] ?? null;

            if (! is_string($arabic) || $arabic === '') {
                $issues[] = $this->error('recitation_without_arabic', $itemPath, $entryIndex, $entryKey);

                continue;
            }

            $requiredCount = null;

            if (array_key_exists('times', $rawItem)) {
                $requiredCount = $this->positiveInt($rawItem, 'times');

                if ($requiredCount === null) {
                    $issues[] = $this->error('invalid_times', $itemPath, $entryIndex, $entryKey);

                    continue;
                }
            }

            $translation = $dua['translation'] ?? null;
            $transliteration = $dua['transliteration'] ?? null;

            if (($translation !== null && ! is_string($translation)) || ($transliteration !== null && ! is_string($transliteration))) {
                $issues[] = $this->error('invalid_structure', $itemPath, $entryIndex, $entryKey);

                continue;
            }

            $position = count($items) + 1;
            $items[] = new FlatItem(
                entryIndex: $entryIndex,
                entryKey: $entryKey,
                variationKey: $variationKey,
                itemKey: $entryKey.':'.$variationKey.':'.$position,
                position: $position,
                kind: 'recitation',
                textAr: $arabic,
                textEn: $translation,
                transliteration: $transliteration,
                speaker: $speaker,
                sourceDuaId: $dua['id'],
                requiredCount: $requiredCount,
                repeatGroup: $repeatGroup,
                repeatTimes: $repeatTimes,
                recordings: $recordings,
            );
        }
    }

    /**
     * @param  array<array-key, mixed>  $step
     * @param  list<ImportIssue>  $issues
     * @return list<array{id: string, reciterId: string, url: string, durationSeconds: int}>
     */
    private function recordings(array $step, string $path, array &$issues, int $entryIndex, string $entryKey): array
    {
        $raw = $step['recordings'] ?? [];

        if (! is_array($raw)) {
            $issues[] = $this->error('invalid_structure', $path, $entryIndex, $entryKey);

            return [];
        }

        $valid = [];

        foreach ($raw as $index => $recording) {
            $recordingPath = $path.'/recordings['.$index.']';

            if (! is_array($recording)) {
                $issues[] = $this->error('recording_incomplete', $recordingPath, $entryIndex, $entryKey);

                continue;
            }

            $id = $recording['id'] ?? null;
            $reciterId = $recording['reciterId'] ?? null;
            $url = $recording['url'] ?? null;
            $duration = $recording['durationSeconds'] ?? null;

            if (! is_string($id) || $id === '' || ! is_string($reciterId) || $reciterId === '' || ! is_string($url) || $url === '' || ! is_int($duration) || $duration < 0) {
                $issues[] = $this->error('recording_incomplete', $recordingPath, $entryIndex, $entryKey);

                continue;
            }

            $valid[] = ['id' => $id, 'reciterId' => $reciterId, 'url' => $url, 'durationSeconds' => $duration];
        }

        return $valid;
    }

    /**
     * One id per recording object on the step; an empty string when the id is missing.
     *
     * @param  array<array-key, mixed>  $step
     * @return list<string>
     */
    private function recordingIdsOf(array $step): array
    {
        $raw = $step['recordings'] ?? [];

        if (! is_array($raw)) {
            return [];
        }

        $ids = [];

        foreach ($raw as $recording) {
            $id = is_array($recording) ? ($recording['id'] ?? null) : null;
            $ids[] = is_string($id) ? $id : '';
        }

        return $ids;
    }

    /**
     * @param  array<array-key, mixed>  $source
     */
    private function positiveInt(array $source, string $key): ?int
    {
        $value = $source[$key] ?? null;

        return is_int($value) && $value > 0 ? $value : null;
    }

    /**
     * @param  array<array-key, mixed>  $value
     */
    private function isNonEmptyList(array $value): bool
    {
        return $value !== [] && array_is_list($value);
    }

    private function error(string $code, string $path, int $entryIndex, string $entryKey): ImportIssue
    {
        return new ImportIssue(ImportIssue::ERROR, $code, $path, $entryIndex, $entryKey);
    }
}
