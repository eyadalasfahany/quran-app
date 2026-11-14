<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Enums;

/**
 * The validator mode of one import (ADR 0089, data-format.md, «Build decisions»). Structure allows drafts and is refused in
 * production; release needs every record approved, every flag decided and every group signed.
 */
enum ImportMode: string
{
    case Structure = 'structure';
    case Release = 'release';
}
