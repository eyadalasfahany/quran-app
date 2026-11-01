<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Services;

use App\Domains\Azkar\Data\FlatItem;
use App\Domains\Azkar\Data\RequiredCountPlan;
use App\Domains\Azkar\OpenDua\StepFlattener;
use App\Domains\Azkar\Sources\SourceProfile;

/**
 * Fills a recitation's missing required_count from the secondary source, matched by book number (ADR 0031 §6, §12,
 * developer 1 Nov 2026). The primary's count wins; a difference is reported, never written over it.
 *
 * Matching: every recitation under one book number is paired with the secondary's recitation under the same number,
 * in order. A pairing is used only when both sides have the same number of recitations. Otherwise the item is
 * ambiguous and stays null. Items inside a repeat group are counted by the group and are never matched.
 */
final class RequiredCountResolver
{
    public function __construct(private readonly StepFlattener $flattener) {}

    /**
     * @param  array<string, mixed>  $primary  The primary catalogue, as parsed and validated.
     * @param  array<string, mixed>  $secondary  The secondary catalogue, as parsed and checksum-verified.
     */
    public function resolve(array $primary, SourceProfile $primaryProfile, array $secondary, string $secondaryCode): RequiredCountPlan
    {
        $primaryByNumber = $this->recitationsByNumber($primary, $primaryProfile->collectionId);
        $secondaryByNumber = $this->recitationsByNumber($secondary, '');

        $fills = [];
        $conflicts = [];
        $ambiguous = [];
        $withoutSecondary = 0;

        foreach ($primaryByNumber as $number => $primaryItems) {
            $secondaryItems = $secondaryByNumber[$number] ?? [];
            $nullItems = array_values(array_filter($primaryItems, static fn (FlatItem $item): bool => $item->requiredCount === null));

            if ($secondaryItems === []) {
                $withoutSecondary += count($nullItems);

                continue;
            }

            if (count($primaryItems) !== count($secondaryItems)) {
                $hasSecondaryCount = array_filter($secondaryItems, static fn (FlatItem $item): bool => $item->requiredCount !== null) !== [];

                foreach ($nullItems as $item) {
                    if ($hasSecondaryCount) {
                        $ambiguous[] = [
                            'item' => $item->itemKey,
                            'entry_index' => $item->entryIndex,
                            'entry' => $item->entryKey,
                            'primary_recitations' => count($primaryItems),
                            'secondary_dhikr' => count($secondaryItems),
                        ];
                    } else {
                        $withoutSecondary++;
                    }
                }

                continue;
            }

            foreach ($primaryItems as $ordinal => $item) {
                $secondaryCount = $secondaryItems[$ordinal]->requiredCount;

                if ($item->requiredCount === null) {
                    if ($secondaryCount === null) {
                        $withoutSecondary++;

                        continue;
                    }

                    $fills[$item->itemKey] = ['count' => $secondaryCount, 'source' => $secondaryCode];

                    continue;
                }

                if ($secondaryCount !== null && $secondaryCount !== $item->requiredCount) {
                    $conflicts[] = [
                        'item' => $item->itemKey,
                        'entry_index' => $item->entryIndex,
                        'entry' => $item->entryKey,
                        'primary' => $item->requiredCount,
                        'secondary' => $secondaryCount,
                    ];
                }
            }
        }

        return new RequiredCountPlan($fills, $conflicts, $ambiguous, $withoutSecondary);
    }

    /**
     * The recitation items of every entry, grouped by book number (the entry's sourceReference), in document order.
     * Items inside a repeat group are left out: the group's times count them.
     *
     * @param  array<string, mixed>  $catalogue
     * @return array<string, list<FlatItem>>
     */
    private function recitationsByNumber(array $catalogue, string $collectionId): array
    {
        $byNumber = [];
        $entries = is_array($catalogue['entries'] ?? null) ? $catalogue['entries'] : [];

        foreach ($entries as $index => $entry) {
            if (! is_array($entry) || ! is_string($entry['id'] ?? null) || ! is_string($entry['sourceReference'] ?? null)) {
                continue;
            }

            $variations = $this->flattener->variationsOf($entry);

            if ($variations === null) {
                continue;
            }

            $entryKey = $collectionId === '' ? $entry['id'] : $collectionId.':'.$entry['id'];

            foreach ($variations as $variation) {
                $flat = $this->flattener->flatten($entryKey, (int) $index, $variation['id'], $variation['steps']);

                foreach ($flat->items as $item) {
                    if ($item->kind === 'recitation' && $item->repeatGroup === null) {
                        $byNumber[$entry['sourceReference']][] = $item;
                    }
                }
            }
        }

        return $byNumber;
    }
}
