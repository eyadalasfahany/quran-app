<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Enums;

/**
 * The outcome of the last word-box build (ADR 0090 decision 6). A pack carries the boxes only when they are approved.
 */
enum WordBoxesStatus: string
{
    case None = 'none';
    case Failed = 'failed';
    case PendingReview = 'pending_review';
    case Approved = 'approved';
}
