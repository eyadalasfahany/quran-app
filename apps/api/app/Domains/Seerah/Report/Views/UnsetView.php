<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Report\Views;

use App\Domains\Seerah\Report\Html;
use App\Domains\Seerah\Report\ReportContext;

/**
 * View 0b: the events whose place is «أخرى» or whose year is in the «غير محدد» bucket, first, with the book's span around each, so the
 * developer can assign the real place or year, or confirm the bucket. Grouped by section in book order.
 */
final class UnsetView implements ReportView
{
    public function render(ReportContext $context): string
    {
        $html = '<section id="unset"><h2>0b. أخرى و غير محدد</h2>';
        $rows = [];

        foreach ($context->run->data->allEvents() as $event) {
            if ($event->place?->id === 'other' || $event->year === null || $event->year->basis->value === 'unspecified') {
                $rows[$event->section][] = $event;
            }
        }

        if ($rows === []) {
            return $html.'<p>لا أحداث في «أخرى» أو «غير محدد».</p></section>';
        }

        foreach ($context->run->index->sections() as $section) {
            if (! isset($rows[$section->id])) {
                continue;
            }

            $html .= '<div class="group" data-batch="'.Html::esc((string) $context->batchOf($section->id)).'"><h3>'.Html::esc($section->id.' · '.$section->title).'</h3>';

            foreach ($rows[$section->id] as $event) {
                $html .= EventCard::render($context, $event);
            }

            $html .= '<details><summary>الفقرات كما هي في الكتاب</summary>';

            foreach ($context->spanParagraphs($rows[$section->id][0]) as $paragraph) {
                $html .= '<p class="para"><span class="ids">'.Html::esc($paragraph['id'].' · '.$paragraph['page']).'</span> '.Html::esc($paragraph['text']).'</p>';
            }

            $html .= '</details></div>';
        }

        return $html.'</section>';
    }
}
