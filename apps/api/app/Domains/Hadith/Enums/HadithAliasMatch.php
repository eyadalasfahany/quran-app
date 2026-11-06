<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Enums;

enum HadithAliasMatch: string
{
    case ExactText = 'exact_text';
    case SimilarText = 'similar_text';
    case NumberOnly = 'number_only';
    case None = 'none';
}
