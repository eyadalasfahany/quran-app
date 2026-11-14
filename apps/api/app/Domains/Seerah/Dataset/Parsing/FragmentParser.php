<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Dataset\Parsing;

use App\Domains\Seerah\Dataset\Evidence;
use App\Domains\Seerah\Dataset\Flag;
use App\Domains\Seerah\Dataset\Geo;
use App\Domains\Seerah\Enums\FlagCode;
use App\Domains\Seerah\Enums\GeoPrecision;
use App\Domains\Seerah\Validation\IssueBag;

/**
 * The shared pieces of every file: the format number, a quote, a flag and a coordinate.
 */
final class FragmentParser
{
    /**
     * @param  array<array-key, mixed>  $decoded
     */
    public static function checkFormat(array $decoded, string $where, IssueBag $issues): void
    {
        if (($decoded['format'] ?? null) !== 1) {
            $issues->error('V2', $where, 'format must be 1');
        }
    }

    /**
     * @return list<Evidence>
     */
    public static function evidence(RecordReader $reader, string $key): array
    {
        return $reader->objectList($key, static function (array $item, string $where) use ($reader): Evidence {
            $quote = new RecordReader($item, $where, 'V3', $reader->issues());
            $quote->expectKeys(['para', 'quote']);

            return new Evidence($quote->string('para'), $quote->string('quote'));
        });
    }

    /**
     * @return list<Flag>
     */
    public static function flags(RecordReader $reader, string $key): array
    {
        return $reader->objectList($key, static function (array $item, string $where) use ($reader): ?Flag {
            $flag = new RecordReader($item, $where, 'V10', $reader->issues());
            $flag->expectKeys(['code', 'note']);
            $code = $flag->enumOrNull('code', FlagCode::class);

            if ($code === null) {
                return null;
            }

            return new Flag($code, $flag->nullableString('note'));
        });
    }

    public static function geo(RecordReader $reader, string $key): ?Geo
    {
        $geo = $reader->object($key, static function (array $item, string $where) use ($reader): Geo {
            $values = new RecordReader($item, $where, 'V6', $reader->issues());
            $values->expectKeys(['lat', 'lng', 'precision', 'source', 'box', 'note']);
            $precision = $values->enumOf('precision', GeoPrecision::class, GeoPrecision::Area);

            return new Geo(
                lat: $values->float('lat'),
                lng: $values->float('lng'),
                precision: $precision,
                source: $values->string('source'),
                box: self::box($values),
                note: $values->nullableString('note'),
            );
        }, true);

        return $geo instanceof Geo ? $geo : null;
    }

    /**
     * @return array{float, float, float, float}|null
     */
    private static function box(RecordReader $values): ?array
    {
        $raw = $values->raw('box');

        if ($raw === null) {
            return null;
        }

        if (count($raw) !== 4 || ! array_is_list($raw) || ! array_all($raw, static fn (mixed $value): bool => is_numeric($value))) {
            $values->issues()->error('V6', $values->where(), 'box must be four numbers: south, west, north, east');

            return null;
        }

        return [(float) $raw[0], (float) $raw[1], (float) $raw[2], (float) $raw[3]];
    }
}
