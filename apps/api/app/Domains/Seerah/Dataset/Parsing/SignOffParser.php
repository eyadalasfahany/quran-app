<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Dataset\Parsing;

use App\Domains\Seerah\Dataset\Decision;
use App\Domains\Seerah\Dataset\SignOff;
use App\Domains\Seerah\Enums\FlagCode;
use App\Domains\Seerah\Validation\IssueBag;

/**
 * Parses reviews/<group>.json (data-format.md, `reviews/<batch>.json`). Written only by `seerah:approve`.
 */
final class SignOffParser
{
    private const array KEYS = ['format', 'group', 'signed_by', 'signed_at', 'records', 'decisions', 'digest'];

    private const array DECISION_KEYS = ['codes', 'note'];

    /**
     * @param  array<array-key, mixed>  $decoded
     */
    public function parse(array $decoded, string $where, IssueBag $issues): SignOff
    {
        FragmentParser::checkFormat($decoded, $where, $issues);
        $reader = new RecordReader($decoded, $where, 'V17', $issues);
        $reader->expectKeys(self::KEYS);

        return new SignOff(
            group: $reader->string('group'),
            signedBy: $reader->string('signed_by'),
            signedAt: $reader->string('signed_at'),
            records: $this->records($decoded['records'] ?? null, $where, $issues),
            decisions: $this->decisions($decoded['decisions'] ?? null, $where, $issues),
            digest: $reader->string('digest'),
        );
    }

    /**
     * @return array<string, string>
     */
    private function records(mixed $value, string $where, IssueBag $issues): array
    {
        if (! is_array($value)) {
            $issues->error('V17', $where, 'records must be an object');

            return [];
        }

        $records = [];

        foreach ($value as $id => $hash) {
            if (! is_string($hash)) {
                $issues->error('V17', $where, 'records.'.$id.' must be a hash string');

                continue;
            }

            $records[(string) $id] = $hash;
        }

        return $records;
    }

    /**
     * @return array<string, Decision>
     */
    private function decisions(mixed $value, string $where, IssueBag $issues): array
    {
        if (! is_array($value)) {
            $issues->error('V17', $where, 'decisions must be an object');

            return [];
        }

        $decisions = [];

        foreach ($value as $id => $item) {
            if (! is_array($item)) {
                $issues->error('V17', $where, 'decisions.'.$id.' must be an object');

                continue;
            }

            $reader = new RecordReader($item, $where.'.decisions.'.$id, 'V17', $issues);
            $reader->expectKeys(self::DECISION_KEYS);
            $codes = [];

            foreach ($reader->stringList('codes') as $code) {
                $case = FlagCode::tryFrom($code);

                if ($case === null) {
                    $issues->error('V18', $where, 'decisions.'.$id.' has an unknown flag code');

                    continue;
                }

                $codes[] = $case;
            }

            $decisions[(string) $id] = new Decision($codes, $reader->string('note'));
        }

        return $decisions;
    }
}
