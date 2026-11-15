<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Review;

use App\Domains\Seerah\Dataset\SeerahDataset;
use App\Domains\Seerah\Enums\FlagCode;
use App\Domains\Seerah\Format\SeerahJson;
use App\Domains\Seerah\Validation\IssueBag;

/**
 * Builds the sign-off of one group (reviews/<group>.json) from the records as they are now. Refuses what the developer must settle
 * first: validator errors, an empty group, a flag or an order exception without a decision in the existing file. Decisions already
 * written by the developer are kept. Nothing here runs without the developer at the keyboard (see seerah:approve).
 */
final class SignOffApprover
{
    /**
     * @return list<string> the reasons for refusing (empty when the group can be signed)
     */
    public function refusals(string $group, SeerahDataset $data, IssueBag $issues): array
    {
        $reasons = [];

        if ($issues->hasErrors()) {
            $reasons[] = 'the validator reports errors; fix them first (php artisan seerah:validate)';
        }

        $records = array_values(array_filter(
            ReviewRecords::of($data),
            static fn (ReviewRecord $record): bool => $record->group === $group,
        ));

        if ($records === []) {
            $reasons[] = 'the group '.$group.' has no records to sign';
        }

        $decisions = $data->signOffs[$group]->decisions ?? [];

        foreach ($this->openItems($group, $data) as $id => $codes) {
            $decision = $decisions[$id] ?? null;

            if ($decision === null) {
                $reasons[] = $id.' has open flags or an order exception and no decision in reviews/'.$group.'.json';

                continue;
            }

            foreach ($codes as $code) {
                if (! in_array($code, $decision->codes, true)) {
                    $reasons[] = $id.' has the flag '.$code->value.' that the decision does not settle';
                }
            }
        }

        return $reasons;
    }

    /**
     * The sign-off file content for a group, in the canonical format.
     *
     * @return array{json: string, digest: string, count: int}
     */
    public function build(string $group, SeerahDataset $data, string $signedBy, string $signedAt): array
    {
        $records = [];

        foreach (ReviewRecords::of($data) as $record) {
            if ($record->group === $group) {
                $records[$record->id] = $record->hash;
            }
        }

        $decisions = [];

        foreach ($data->signOffs[$group]->decisions ?? [] as $id => $decision) {
            $decisions[$id] = ['codes' => array_map(static fn (FlagCode $code): string => $code->value, $decision->codes), 'note' => $decision->note];
        }

        $digest = ReviewRecords::digest($records);
        $file = [
            'format' => 1,
            'group' => $group,
            'signed_by' => $signedBy,
            'signed_at' => $signedAt,
            'records' => $records,
            'decisions' => $decisions === [] ? new \stdClass : $decisions,
            'digest' => $digest,
        ];

        return ['json' => SeerahJson::render($file), 'digest' => $digest, 'count' => count($records)];
    }

    /**
     * Records that carry a flag or an order exception, with their flag codes.
     *
     * @return array<string, list<FlagCode>>
     */
    private function openItems(string $group, SeerahDataset $data): array
    {
        $items = [];

        if ($group === 'G') {
            foreach ($data->gazetteer->places ?? [] as $place) {
                if ($place->flags !== []) {
                    $items[$place->id] = array_map(static fn ($flag): FlagCode => $flag->code, $place->flags);
                }
            }
        }

        foreach ($data->events[$group]->events ?? [] as $event) {
            if ($event->flags !== [] || $event->orderException !== null) {
                $items[$event->id] = array_map(static fn ($flag): FlagCode => $flag->code, $event->flags);
            }
        }

        return $items;
    }
}
