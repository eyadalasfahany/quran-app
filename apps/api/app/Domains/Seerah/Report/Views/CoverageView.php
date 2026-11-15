<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Report\Views;

use App\Domains\Seerah\Report\Html;
use App\Domains\Seerah\Report\ReportContext;

/**
 * View 5: every section in book order with the events that cover it (and their spans) or its exclusion and reason. Then the
 * exclusions, the routes and the milestones.
 */
final class CoverageView implements ReportView
{
    public function render(ReportContext $context): string
    {
        $data = $context->run->data;
        $excluded = [];

        foreach ($data->exclusions as $exclusion) {
            $excluded[$exclusion->section] = $exclusion;
        }

        $covering = [];

        foreach ($data->allEvents() as $event) {
            $covering[$event->section][] = $event;
        }

        $html = '<section id="coverage"><h2>5. التغطية</h2><table class="coverage"><thead><tr><th>القسم</th><th>الصفحة</th><th>العنوان</th><th>الدفعة</th><th>الأحداث</th><th>الاستثناء</th></tr></thead><tbody>';

        foreach ($context->run->index->sections() as $section) {
            $events = $covering[$section->id] ?? [];
            $exclusion = $excluded[$section->id] ?? null;
            $state = $events !== [] ? 'covered' : ($exclusion !== null ? 'excluded' : 'uncovered');
            $html .= '<tr class="'.$state.'" data-batch="'.Html::esc((string) $context->batchOf($section->id)).'"><td class="ltr">'.Html::esc($section->id).'</td><td>'.$section->page.'</td>'
                .'<td>'.Html::esc($section->title).'</td><td>'.Html::esc((string) $context->batchOf($section->id)).'</td>'
                .'<td>'.Html::esc(implode(' ', array_map(static fn ($event): string => $event->id.($event->span === null ? '' : ' ['.$event->span->from.'–'.$event->span->to.']'), $events))).'</td>'
                .'<td>'.Html::esc($exclusion === null ? '' : $exclusion->reason->value.($exclusion->note === null ? '' : ': '.$exclusion->note)).'</td></tr>';
        }

        $html .= '</tbody></table><h3>الاستثناءات</h3><ul>';

        foreach ($data->exclusions as $exclusion) {
            $html .= '<li>'.Html::esc($exclusion->section.' · '.$exclusion->reason->value.($exclusion->note === null ? '' : ' · '.$exclusion->note)).'</li>';
        }

        if ($data->exclusions === []) {
            $html .= '<li>لا استثناءات بعد.</li>';
        }

        $html .= '</ul><h3>المسارات</h3><ul>';

        foreach ($data->routes as $route) {
            $html .= '<li>'.Html::esc($route->id.' · '.$route->kind->value.' · '.implode(' › ', $route->stops).' · '.implode(' ', $route->events)).'</li>';
        }

        if ($data->routes === []) {
            $html .= '<li>لا مسارات بعد.</li>';
        }

        $html .= '</ul><h3>المحطات</h3><ul>';

        foreach ($data->milestones as $milestone) {
            $html .= '<li>'.Html::esc($milestone->key.' · '.$milestone->labelAr.' · '.$milestone->event).'</li>';
        }

        if ($data->milestones === []) {
            $html .= '<li>لا محطات بعد.</li>';
        }

        return $html.'</ul></section>';
    }
}
