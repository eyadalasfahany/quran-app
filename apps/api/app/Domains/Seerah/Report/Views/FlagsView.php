<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Report\Views;

use App\Domains\Seerah\Report\Html;
use App\Domains\Seerah\Report\ReportContext;

/**
 * View 4: every record that needs a developer decision (a flag, or an event the book tells out of order), with the book's paragraphs
 * around it. The decision itself is recorded by the developer in reviews/<group>.json.
 */
final class FlagsView implements ReportView
{
    public function render(ReportContext $context): string
    {
        $html = '<section id="flags"><h2>4. قائمة القرارات</h2>';
        $count = 0;

        foreach ($context->run->data->gazetteer->places ?? [] as $place) {
            if ($place->flags === []) {
                continue;
            }

            $count++;
            $html .= '<article class="event" data-status="'.Html::esc($context->status('G', $place->id)->value).'"><h4>'.Html::esc($place->nameAr).' <span class="ids">gazetteer · '.Html::esc($place->id).'</span></h4><ul class="flags">';

            foreach ($place->flags as $flag) {
                $html .= '<li class="flag">'.Html::esc($flag->code->value).($flag->note === null ? '' : ': '.Html::esc($flag->note)).'</li>';
            }

            $html .= '</ul></article>';
        }

        foreach ($context->run->data->allEvents() as $event) {
            if ($event->flags === [] && $event->orderException === null) {
                continue;
            }

            $count++;
            $html .= EventCard::render($context, $event);
        }

        if ($count === 0) {
            return $html.'<p>لا قرارات مفتوحة.</p></section>';
        }

        return $html.'<p>'.$count.' قرار(ات) مفتوح(ة).</p></section>';
    }
}
