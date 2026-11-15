<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Validation\Rules;

use App\Domains\Seerah\Validation\IssueBag;
use App\Domains\Seerah\Validation\ValidationContext;

/**
 * One validator rule (data-format.md, V1 to V19). It reports into the bag and never changes the data.
 */
interface ValidationRule
{
    public function check(ValidationContext $context, IssueBag $issues): void;
}
