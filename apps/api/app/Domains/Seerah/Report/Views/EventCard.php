<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Report\Views;

use App\Domains\Seerah\Dataset\EventRecord;
use App\Domains\Seerah\Dataset\Evidence;
use App\Domains\Seerah\Report\Html;
use App\Domains\Seerah\Report\ReportContext;

/**
 * One event as the developer reviews it: the heading, the place path, the year, and both quotes shown in their paragraphs with the
 * quote highlighted. A quote that is not in its paragraph is shown in red (V3 would already fail).
 */
final class EventCard
{
    public static function render(ReportContext $context, EventRecord $event): string
    {
        $status = $context->status($event->batch, $event->id);
        $html = '<article class="event" data-batch="'.Html::esc($event->batch).'" data-status="'.Html::esc($status->value).'" id="'.Html::esc($event->id).'">';
        $html .= '<header><h4>'.Html::esc($event->titleAr).'</h4> <span class="ids">'.Html::esc($event->batch.' · '.$event->id.' · '.$event->section).'</span> '
            .Html::badge($status->value, 'status-'.$status->value).'</header>';

        $html .= '<dl>';
        $html .= '<dt>المكان</dt><dd>'.self::place($context, $event).'</dd>';
        $html .= '<dt>السنة</dt><dd>'.self::year($context, $event).'</dd>';

        foreach ($event->year->evidence ?? [] as $evidence) {
            $html .= '<dt>نص السنة</dt><dd>'.self::quote($context, $evidence).'</dd>';
        }

        foreach ($event->place->evidence ?? [] as $evidence) {
            $html .= '<dt>نص المكان</dt><dd>'.self::quote($context, $evidence).'</dd>';
        }

        $html .= '</dl>';
        $html .= self::flags($event);
        $html .= '</article>';

        return $html;
    }

    private static function place(ReportContext $context, EventRecord $event): string
    {
        if ($event->place === null) {
            return Html::badge('لم يُحدَّد بعد', 'flag');
        }

        $label = $event->place->id === 'other' ? 'أخرى' : $context->placePath($event->place->id);

        return Html::esc($label).' '.Html::badge($event->place->basis->value);
    }

    private static function year(ReportContext $context, EventRecord $event): string
    {
        $year = $event->year;

        if ($year === null) {
            return Html::badge('لم يُحدَّد بعد', 'flag');
        }

        $label = Html::esc($context->ageLabel($year)).' '.Html::badge($year->basis->value).' '.Html::badge($year->certainty->value);

        return $label;
    }

    private static function quote(ReportContext $context, Evidence $evidence): string
    {
        $paragraph = $context->paragraphText($evidence->para);

        if ($paragraph === null) {
            return Html::badge('فقرة غير موجودة: '.$evidence->para, 'flag');
        }

        $highlighted = Html::highlight($paragraph, $evidence->quote);

        if ($highlighted === null) {
            return Html::badge('الاقتباس ليس في '.$evidence->para, 'flag').' <span class="para">'.Html::esc($paragraph).'</span>';
        }

        return '<span class="para">'.$highlighted.'</span> <span class="ids">'.Html::esc($evidence->para).'</span>';
    }

    private static function flags(EventRecord $event): string
    {
        $items = [];

        foreach ($event->flags as $flag) {
            $items[] = '<li class="flag">'.Html::esc($flag->code->value).($flag->note === null ? '' : ': '.Html::esc($flag->note)).'</li>';
        }

        if ($event->orderException !== null) {
            $items[] = '<li class="flag">order_exception: '.Html::esc($event->orderException).'</li>';
        }

        return $items === [] ? '' : '<ul class="flags">'.implode('', $items).'</ul>';
    }
}
