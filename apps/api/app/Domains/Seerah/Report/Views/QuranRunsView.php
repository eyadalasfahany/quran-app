<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Report\Views;

use App\Domains\Seerah\Report\Html;
use App\Domains\Seerah\Report\ReportContext;

/**
 * View 6: every braced run of the book (its way of quoting an ayah), with its paragraph. The edition in use has none; the list is kept
 * for the classification step.
 */
final class QuranRunsView implements ReportView
{
    public function render(ReportContext $context): string
    {
        $html = '<section id="runs"><h2>6. الاقتباسات بين أقواس</h2>';
        $rows = 0;

        foreach ($context->build->book->paragraphs as $paragraph) {
            if (preg_match_all('/\{[^{}]*\}/u', $paragraph->text, $matches) === 0) {
                continue;
            }

            foreach ($matches[0] as $run) {
                $rows++;
                $html .= '<p class="para"><span class="ids">'.Html::esc($paragraph->id).'</span> '.Html::esc($run).'</p>';
            }
        }

        if ($rows === 0) {
            return $html.'<p>لا اقتباسات بين أقواس في هذه الطبعة.</p></section>';
        }

        return $html.'</section>';
    }
}
