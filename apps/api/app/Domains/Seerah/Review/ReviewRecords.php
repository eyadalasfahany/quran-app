<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Review;

use App\Domains\Seerah\Dataset\RecordSerializer;
use App\Domains\Seerah\Dataset\SeerahDataset;
use App\Domains\Seerah\Enums\ReviewStatus;
use App\Domains\Seerah\Format\SeerahJson;

/**
 * Lists every record that a sign-off covers, with its hash, and computes the digest of a sign-off. Groups: places and exclusions
 * sign under G; events under their batch; routes and milestones under M (plan, «The review gate»).
 */
final class ReviewRecords
{
    /**
     * @return list<ReviewRecord>
     */
    public static function of(SeerahDataset $data): array
    {
        $records = [];

        foreach ($data->gazetteer?->places ?? [] as $place) {
            $records[] = self::record('G', $place->id, RecordSerializer::place($place));
        }

        foreach ($data->exclusions as $exclusion) {
            $records[] = self::record('G', $exclusion->section, RecordSerializer::exclusion($exclusion));
        }

        foreach ($data->events as $batch => $file) {
            foreach ($file->events as $event) {
                $records[] = self::record($batch, $event->id, RecordSerializer::event($event));
            }
        }

        foreach ($data->routes as $route) {
            $records[] = self::record('M', $route->id, RecordSerializer::route($route));
        }

        foreach ($data->milestones as $milestone) {
            $records[] = self::record('M', $milestone->key, RecordSerializer::milestone($milestone));
        }

        return $records;
    }

    /**
     * The status of one record against the sign-off of its group (the sign-off's own hash decides, never the text of the record).
     */
    public static function statusOf(ReviewRecord $record, SeerahDataset $data): ReviewStatus
    {
        $signOff = $data->signOffs[$record->group] ?? null;

        if ($signOff === null || ! array_key_exists($record->id, $signOff->records)) {
            return ReviewStatus::Draft;
        }

        return hash_equals($signOff->records[$record->id], $record->hash) ? ReviewStatus::Approved : ReviewStatus::Stale;
    }

    /**
     * The digest of a sign-off: the SHA-256 of its sorted `id:hash` lines, one per line (the report prints it).
     *
     * @param  array<string, string>  $records
     */
    public static function digest(array $records): string
    {
        $lines = [];

        foreach ($records as $id => $hash) {
            $lines[] = $id.':'.$hash;
        }

        sort($lines, SORT_STRING);

        return hash('sha256', implode("\n", $lines));
    }

    /**
     * @param  array<string, mixed>  $serialised
     */
    private static function record(string $group, string $id, array $serialised): ReviewRecord
    {
        return new ReviewRecord($group, $id, hash('sha256', SeerahJson::compact($serialised)));
    }
}
