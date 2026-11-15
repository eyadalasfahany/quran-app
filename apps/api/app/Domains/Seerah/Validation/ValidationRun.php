<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Validation;

use App\Domains\Seerah\Dataset\BookIndex;
use App\Domains\Seerah\Dataset\SeerahDataset;

/**
 * One validation run and what it read: the issues, the parsed data and the book index. The report and the approver use the same run.
 */
final readonly class ValidationRun
{
    public function __construct(
        public IssueBag $issues,
        public SeerahDataset $data,
        public BookIndex $index,
    ) {}
}
