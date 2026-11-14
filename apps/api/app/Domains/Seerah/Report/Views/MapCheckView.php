<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Report\Views;

use App\Domains\Seerah\Report\Html;
use App\Domains\Seerah\Report\ReportContext;

/**
 * View 3: each drawn map with every place at its position, labelled and coloured by status, and a year slider that dims the places with
 * no event in that year, so the developer sees the highlight before any app code exists. Inline script and style only.
 */
final class MapCheckView implements ReportView
{
    public function render(ReportContext $context): string
    {
        $html = '<section id="maps"><h2>3. فحص الخرائط</h2>';
        $layouts = $context->run->data->layouts;

        if ($layouts === []) {
            return $html.'<p>لا خرائط مرسومة بعد.</p></section>';
        }

        $html .= '<label>السنة <input type="range" min="0" max="63" value="63" class="year-slider" oninput="seerahYear(this)"></label> <span class="year-label">63</span>';

        foreach ($layouts as $layout) {
            [$x, $y, $width, $height] = $layout->viewbox;
            $html .= '<h3>'.Html::esc($layout->level).'</h3>';
            $html .= '<svg class="map" viewBox="'.Html::esc($x.' '.$y.' '.$width.' '.$height).'" role="img" aria-label="'.Html::esc($layout->level).'">';

            foreach ($layout->positions as $position) {
                $place = $context->tree()->get($position->place);
                $ages = [];

                foreach ($context->run->data->allEvents() as $event) {
                    if ($event->place?->id === $position->place && $event->year?->ageFrom !== null) {
                        $ages[] = $event->year->ageFrom;
                    }
                }

                $html .= '<g class="pin" data-ages="'.Html::esc(implode(',', $ages)).'">'
                    .'<circle cx="'.Html::esc((string) $position->x).'" cy="'.Html::esc((string) $position->y).'" r="8" class="status-'.Html::esc($context->status('G', $position->place)->value).'"/>'
                    .'<text x="'.Html::esc((string) ($position->x + 12)).'" y="'.Html::esc((string) ($position->y + 4)).'">'.Html::esc($place?->nameAr ?? $position->place).'</text></g>';
            }

            $html .= '</svg>';
        }

        $script = "function seerahYear(input){var y=parseInt(input.value,10);document.querySelector('.year-label').textContent=y;"
            ."document.querySelectorAll('.pin').forEach(function(p){var ages=p.dataset.ages?p.dataset.ages.split(',').map(Number):[];"
            ."p.classList.toggle('dimmed', ages.indexOf(y)===-1);});}";

        return $html.'<script>'.$script.'</script></section>';
    }
}
