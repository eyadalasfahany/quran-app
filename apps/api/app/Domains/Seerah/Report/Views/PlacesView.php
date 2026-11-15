<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Report\Views;

use App\Domains\Seerah\Dataset\EventRecord;
use App\Domains\Seerah\Dataset\Place;
use App\Domains\Seerah\Report\Html;
use App\Domains\Seerah\Report\ReportContext;

/**
 * View 2: the gazetteer tree. Each place with its names in the book, its quotes in their paragraphs, its coordinates, and every event
 * that uses it in year order. A landmark with no event is listed as «بلا حدث».
 */
final class PlacesView implements ReportView
{
    public function render(ReportContext $context): string
    {
        $places = $context->run->data->gazetteer->places ?? [];
        $html = '<section id="places"><h2>2. حسب المكان</h2>';

        if ($places === []) {
            return $html.'<p>لا أماكن بعد.</p></section>';
        }

        $usage = [];

        foreach ($context->run->data->allEvents() as $event) {
            if ($event->place !== null) {
                $usage[$event->place->id][] = $event;
            }
        }

        $roots = array_values(array_filter($places, static fn (Place $place): bool => $place->parent === null));

        foreach ($roots as $root) {
            $html .= self::node($context, $places, $root, 0, $usage);
        }

        return $html.'</section>';
    }

    /**
     * @param  list<Place>  $places
     * @param  array<string, list<EventRecord>>  $usage
     */
    private static function node(ReportContext $context, array $places, Place $place, int $depth, array $usage): string
    {
        $events = $usage[$place->id] ?? [];
        usort($events, static fn ($a, $b): int => ($a->year->ageFrom ?? 999) <=> ($b->year->ageFrom ?? 999));

        $html = '<div class="place" style="margin-inline-start:'.($depth * 16).'px" data-status="'.Html::esc($context->status('G', $place->id)->value).'">';
        $html .= '<h3>'.Html::esc($place->nameAr).' <span class="ids">'.Html::esc($place->id.' · '.$place->kind->value).'</span> '
            .Html::badge($context->status('G', $place->id)->value, 'status-'.$context->status('G', $place->id)->value).'</h3>';

        if ($place->namesInBook !== []) {
            $html .= '<p>الأسماء في الكتاب: '.Html::esc(implode('، ', $place->namesInBook)).'</p>';
        }

        if ($place->geo !== null) {
            $html .= '<p class="ltr">'.Html::esc(sprintf('%.4f, %.4f', $place->geo->lat, $place->geo->lng)).' · '.Html::esc($place->geo->source.' · '.$place->geo->precision->value).'</p>';
        } elseif ($place->id !== 'other') {
            $html .= '<p>'.Html::badge('بلا إحداثيات', 'flag').'</p>';
        }

        foreach ($place->evidence as $evidence) {
            $paragraph = $context->paragraphText($evidence->para);
            $highlighted = $paragraph === null ? null : Html::highlight($paragraph, $evidence->quote);
            $html .= '<p class="para">'.($highlighted ?? Html::badge('الاقتباس ليس في '.$evidence->para, 'flag')).' <span class="ids">'.Html::esc($evidence->para).'</span></p>';
        }

        if ($events === [] && $place->kind->value === 'landmark') {
            $html .= '<p>'.Html::badge('بلا حدث', 'flag').'</p>';
        }

        foreach ($events as $event) {
            $html .= '<p class="ids">'.Html::esc($event->batch.' · '.$event->id).' · '.Html::esc($event->titleAr).' · '.Html::esc($context->ageLabel($event->year)).'</p>';
        }

        $html .= '</div>';

        foreach ($places as $child) {
            if ($child->parent === $place->id) {
                $html .= self::node($context, $places, $child, $depth + 1, $usage);
            }
        }

        return $html;
    }
}
