<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Dataset\Parsing;

use App\Domains\Seerah\Dataset\Exclusion;
use App\Domains\Seerah\Enums\ExclusionReason;
use App\Domains\Seerah\Validation\IssueBag;

/**
 * Parses exclusions.json (data-format.md, `exclusions.json`).
 */
final class ExclusionParser
{
    private const array FILE_KEYS = ['format', 'excluded'];

    private const array ITEM_KEYS = ['section', 'reason', 'note'];

    /**
     * @param  array<array-key, mixed>  $decoded
     * @return list<Exclusion>
     */
    public function parse(array $decoded, string $where, IssueBag $issues): array
    {
        FragmentParser::checkFormat($decoded, $where, $issues);
        $reader = new RecordReader($decoded, $where, 'V13', $issues);
        $reader->expectKeys(self::FILE_KEYS);

        return $reader->objectList('excluded', function (array $item, string $at) use ($issues): Exclusion {
            $exclusion = new RecordReader($item, $at, 'V13', $issues);
            $exclusion->expectKeys(self::ITEM_KEYS);
            $reason = $exclusion->enumOf('reason', ExclusionReason::class, ExclusionReason::Other);

            return new Exclusion(
                section: $exclusion->string('section'),
                reason: $reason,
                note: $exclusion->nullableString('note'),
            );
        });
    }
}
