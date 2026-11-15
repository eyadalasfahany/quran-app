<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Report\Views;

use App\Domains\Seerah\Report\ReportContext;

/**
 * One section of the review report. It returns HTML only; every value it writes goes through Html::esc().
 */
interface ReportView
{
    public function render(ReportContext $context): string;
}
