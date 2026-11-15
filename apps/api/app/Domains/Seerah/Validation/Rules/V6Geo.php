<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Validation\Rules;

use App\Domains\Seerah\Dataset\Flag;
use App\Domains\Seerah\Dataset\GeoMath;
use App\Domains\Seerah\Dataset\PlaceTree;
use App\Domains\Seerah\Enums\FlagCode;
use App\Domains\Seerah\Enums\PlaceKind;
use App\Domains\Seerah\Validation\IssueBag;
use App\Domains\Seerah\Validation\ValidationContext;

/**
 * V6: coordinates are present (except for `other` and a region flagged not in the book, which have none), inside the plausible box,
 * from a named source; a landmark is within 40 km of its city; a city is inside its region's box.
 */
final class V6Geo implements ValidationRule
{
    private const float LANDMARK_RADIUS_KM = 40.0;

    public const string SOURCE = '/^(wikidata:Q\d+|manual)$/';

    public function check(ValidationContext $context, IssueBag $issues): void
    {
        $gazetteer = $context->data->gazetteer;

        if ($gazetteer === null) {
            return;
        }

        $tree = new PlaceTree($gazetteer->places);
        $box = $context->geoBox;

        foreach ($gazetteer->places as $place) {
            $where = 'gazetteer '.$place->id;
            $flagged = $this->notInBook($place->flags);

            if ($place->id === 'other') {
                if ($place->geo !== null) {
                    $issues->error('V6', $where, 'the place other has no coordinates');
                }

                continue;
            }

            if ($place->geo === null) {
                if (! $flagged) {
                    $issues->error('V6', $where, 'coordinates are missing');
                }

                continue;
            }

            $geo = $place->geo;

            if ($geo->lat < $box['south'] || $geo->lat > $box['north'] || $geo->lng < $box['west'] || $geo->lng > $box['east']) {
                $issues->error('V6', $where, 'coordinates are outside the plausible box');
            }

            if (! preg_match(self::SOURCE, $geo->source)) {
                $issues->error('V6', $where, 'geo source must be wikidata:Q… or manual');
            }

            if ($place->kind === PlaceKind::Landmark && $place->parent !== null) {
                $this->landmarkNearCity($tree, $place->parent, $geo->lat, $geo->lng, $where, $issues);
            }

            if ($place->kind === PlaceKind::City && $place->parent !== null) {
                $region = $tree->get($place->parent);
                $regionBox = $region?->geo?->box;

                if ($regionBox !== null && ! $this->inside($geo->lat, $geo->lng, $regionBox)) {
                    $issues->error('V6', $where, 'city lies outside its region\'s box');
                }
            }
        }
    }

    /**
     * @param  list<Flag>  $flags
     */
    private function notInBook(array $flags): bool
    {
        foreach ($flags as $flag) {
            if ($flag->code === FlagCode::NotInBookDirectly) {
                return true;
            }
        }

        return false;
    }

    private function landmarkNearCity(PlaceTree $tree, string $cityId, float $lat, float $lng, string $where, IssueBag $issues): void
    {
        $city = $tree->get($cityId);

        if ($city?->geo === null || $city->kind !== PlaceKind::City) {
            return;
        }

        if (GeoMath::distanceKm($lat, $lng, $city->geo->lat, $city->geo->lng) > self::LANDMARK_RADIUS_KM) {
            $issues->error('V6', $where, 'landmark lies more than 40 km from its city');
        }
    }

    /**
     * @param  array{float, float, float, float}  $box  south, west, north, east
     */
    private function inside(float $lat, float $lng, array $box): bool
    {
        return $lat >= $box[0] && $lat <= $box[2] && $lng >= $box[1] && $lng <= $box[3];
    }
}
