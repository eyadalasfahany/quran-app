<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Dataset\Parsing;

use App\Domains\Seerah\Dataset\Milestone;
use App\Domains\Seerah\Validation\IssueBag;

/**
 * Parses milestones.json (data-format.md, `milestones.json`). Each entry is `{ id, label_ar, event }`; the age is read from the event.
 */
final class MilestoneParser
{
    private const array FILE_KEYS = ['format', 'milestones'];

    private const array MILESTONE_KEYS = ['id', 'label_ar', 'event'];

    /**
     * @param  array<array-key, mixed>  $decoded
     * @return list<Milestone>
     */
    public function parse(array $decoded, string $where, IssueBag $issues): array
    {
        FragmentParser::checkFormat($decoded, $where, $issues);
        $reader = new RecordReader($decoded, $where, 'V15', $issues);
        $reader->expectKeys(self::FILE_KEYS);

        return $reader->objectList('milestones', function (array $item, string $at) use ($issues): Milestone {
            $milestone = new RecordReader($item, $at, 'V15', $issues);
            $milestone->expectKeys(self::MILESTONE_KEYS);

            return new Milestone(
                key: $milestone->string('id'),
                labelAr: $milestone->string('label_ar'),
                event: $milestone->string('event'),
            );
        });
    }
}
