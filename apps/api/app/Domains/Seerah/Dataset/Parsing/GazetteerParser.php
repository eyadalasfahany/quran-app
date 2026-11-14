<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Dataset\Parsing;

use App\Domains\Seerah\Dataset\Gazetteer;
use App\Domains\Seerah\Dataset\Place;
use App\Domains\Seerah\Enums\Origin;
use App\Domains\Seerah\Enums\PlaceKind;
use App\Domains\Seerah\Validation\IssueBag;

/**
 * Parses gazetteer.json (data-format.md, `gazetteer.json`).
 */
final class GazetteerParser
{
    private const array KEYS = ['format', 'source_sha256', 'places'];

    private const array PLACE_KEYS = [
        'id', 'parent', 'kind', 'name_ar', 'names_in_book', 'name_en', 'geo', 'evidence', 'origin', 'flags', 'note',
    ];

    /**
     * @param  array<array-key, mixed>  $decoded
     */
    public function parse(array $decoded, string $where, IssueBag $issues): Gazetteer
    {
        FragmentParser::checkFormat($decoded, $where, $issues);
        $reader = new RecordReader($decoded, $where, 'V2', $issues);
        $reader->expectKeys(self::KEYS);

        return new Gazetteer(
            sourceSha256: $reader->string('source_sha256'),
            places: $reader->objectList('places', fn (array $item, string $at): Place => $this->place($item, $at, $issues)),
        );
    }

    /**
     * @param  array<array-key, mixed>  $item
     */
    private function place(array $item, string $where, IssueBag $issues): Place
    {
        $reader = new RecordReader($item, $where, 'V4', $issues);
        $reader->expectKeys(self::PLACE_KEYS);
        $kind = $reader->enumOf('kind', PlaceKind::class, PlaceKind::Region);
        $origin = $reader->enumOf('origin', Origin::class, Origin::DraftedByAgent);

        return new Place(
            id: $reader->string('id'),
            parent: $reader->nullableString('parent'),
            kind: $kind,
            nameAr: $reader->string('name_ar'),
            namesInBook: $reader->stringList('names_in_book'),
            nameEn: $reader->nullableString('name_en'),
            geo: FragmentParser::geo($reader, 'geo'),
            evidence: FragmentParser::evidence($reader, 'evidence'),
            origin: $origin,
            flags: FragmentParser::flags($reader, 'flags'),
            note: $reader->nullableString('note'),
        );
    }
}
