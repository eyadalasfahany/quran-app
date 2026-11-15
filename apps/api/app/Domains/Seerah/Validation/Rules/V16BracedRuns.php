<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Validation\Rules;

use App\Domains\Seerah\Validation\IssueBag;
use App\Domains\Seerah\Validation\ValidationContext;

/**
 * V16: the book's braced runs (its way of quoting an ayah). The edition in use has none; any that appear are listed, because the
 * classification against the Quran index is not built yet. No Quran text is stored outside the book's own paragraphs.
 */
final class V16BracedRuns implements ValidationRule
{
    public function check(ValidationContext $context, IssueBag $issues): void
    {
        $runs = 0;

        foreach ($context->book->paragraphs as $paragraph) {
            $runs += preg_match_all('/\{[^{}]*\}/u', $paragraph->text);
        }

        if ($runs > 0) {
            $issues->warning('V16', 'canonical text', $runs.' braced run(s); classification against the Quran index is not built yet');
        }

        $issues->info('V16', 'canonical text', $runs.' braced run(s)');
    }
}
