<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Validation\Rules;

use App\Domains\Seerah\Validation\IssueBag;
use App\Domains\Seerah\Validation\ValidationContext;

/**
 * V3: every quote is a byte-exact substring of its stated paragraph of the canonical text, trimmed, at least 8 characters long.
 * Messages name the record and the paragraph id, never the quote.
 */
final class V3Quotes implements ValidationRule
{
    public function check(ValidationContext $context, IssueBag $issues): void
    {
        foreach (Evidences::all($context) as $site) {
            $evidence = $site['evidence'];
            $where = $site['where'];
            $paragraph = $context->index->paragraph($evidence->para);

            if ($paragraph === null) {
                $issues->error('V3', $where, 'quote names a paragraph that does not exist: '.$evidence->para);

                continue;
            }

            if ($evidence->quote === '') {
                $issues->error('V3', $where, 'quote is empty');

                continue;
            }

            if (trim($evidence->quote) !== $evidence->quote) {
                $issues->error('V3', $where, 'quote has leading or trailing whitespace');
            }

            if (mb_strlen($evidence->quote) < 8) {
                $issues->error('V3', $where, 'quote is shorter than 8 characters');
            }

            if (! str_contains($paragraph->text, $evidence->quote)) {
                $issues->error('V3', $where, 'quote is not a byte-exact substring of '.$evidence->para);
            }
        }
    }
}
