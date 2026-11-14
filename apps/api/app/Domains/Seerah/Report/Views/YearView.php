<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Report\Views;

use App\Domains\Seerah\Report\Html;
use App\Domains\Seerah\Report\ReportContext;

/**
 * View 1: by batch, then by the Prophet's age from 0 to 63, then «غير محدد», then the events of each age in book order.
 */
final class YearView implements ReportView
{
    public function render(ReportContext $context): string
    {
        $html = '<section id="years"><h2>1. حسب الدفعة والسنة</h2>';

        foreach (array_keys($context->batches) as $batch) {
            $events = $context->run->data->events[$batch]->events ?? [];
            $byAge = [];
            $unset = [];

            foreach ($events as $event) {
                if ($event->year?->ageFrom === null) {
                    $unset[] = $event;
                } else {
                    $byAge[$event->year->ageFrom][] = $event;
                }
            }

            ksort($byAge);
            $html .= '<div class="batch" data-batch="'.Html::esc($batch).'"><h3>'.Html::esc($batch.' · '.$context->batches[$batch]['period']).' ('.count($events).')</h3>';

            foreach ($byAge as $age => $list) {
                $html .= '<div class="age"><h4>السن '.$age.' · '.Html::esc($context->ageLabel($list[0]->year)).'</h4>';

                foreach ($list as $event) {
                    $html .= EventCard::render($context, $event);
                }

                $html .= '</div>';
            }

            if ($unset !== []) {
                $html .= '<div class="age"><h4>غير محدد</h4>';

                foreach ($unset as $event) {
                    $html .= EventCard::render($context, $event);
                }

                $html .= '</div>';
            }

            if ($events === []) {
                $html .= '<p>لا أحداث بعد في هذه الدفعة.</p>';
            }

            $html .= '</div>';
        }

        return $html.'</section>';
    }
}
