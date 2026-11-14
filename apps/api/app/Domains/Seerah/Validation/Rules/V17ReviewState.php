<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Validation\Rules;

use App\Domains\Seerah\Enums\ReviewStatus;
use App\Domains\Seerah\Review\ReviewRecords;
use App\Domains\Seerah\Validation\IssueBag;
use App\Domains\Seerah\Validation\ValidationContext;

/**
 * V17: the review state of every record, derived from its group's sign-off by hash. The sign-off's own digest and group must agree
 * with its content. --release needs every record approved and every group that has records signed.
 */
final class V17ReviewState implements ValidationRule
{
    public function check(ValidationContext $context, IssueBag $issues): void
    {
        $counts = [ReviewStatus::Approved->value => 0, ReviewStatus::Stale->value => 0, ReviewStatus::Draft->value => 0];
        $groups = [];

        foreach ($context->data->signOffs as $name => $signOff) {
            if ($signOff->group !== $name) {
                $issues->error('V17', 'reviews '.$name, 'the sign-off names another group');
            }

            if (! hash_equals($signOff->digest, ReviewRecords::digest($signOff->records))) {
                $issues->error('V17', 'reviews '.$name, 'the digest does not match the signed records');
            }
        }

        foreach (ReviewRecords::of($context->data) as $record) {
            $status = ReviewRecords::statusOf($record, $context->data);
            $counts[$status->value]++;
            $groups[$record->group] = true;

            if ($context->release && $status !== ReviewStatus::Approved) {
                $issues->error('V17', $record->group.' '.$record->id, 'the record is '.$status->value.'; release needs it approved');
            }
        }

        if ($context->release) {
            foreach (array_keys($groups) as $group) {
                if (! isset($context->data->signOffs[$group])) {
                    $issues->error('V17', 'reviews '.$group, 'no sign-off file for the group');
                }
            }
        }

        $issues->info('V17', 'review', 'approved '.$counts['approved'].', stale '.$counts['stale'].', draft '.$counts['draft']);
    }
}
