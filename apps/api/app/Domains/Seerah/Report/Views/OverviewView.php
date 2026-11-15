<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Report\Views;

use App\Domains\Seerah\Enums\ReviewStatus;
use App\Domains\Seerah\Report\Html;
use App\Domains\Seerah\Report\ReportContext;
use App\Domains\Seerah\Validation\Severity;

/**
 * View 0: the pins, the counts per batch, the status counts, and the validator's errors and warnings.
 */
final class OverviewView implements ReportView
{
    public function render(ReportContext $context): string
    {
        $run = $context->run;
        $build = $context->build;
        $data = $run->data;
        $html = '<section id="overview"><h2>0. نظرة عامة</h2>';

        $html .= '<table><tbody>'
            .'<tr><th>المصدر</th><td>'.Html::esc('Shamela0023692 (OpenITI), ref '.(string) config('seerah.source.ref')).'</td></tr>'
            .'<tr><th>SHA-256 للمصدر</th><td class="ltr">'.Html::esc($build->sourceSha256).'</td></tr>'
            .'<tr><th>SHA-256 للنص القانوني</th><td class="ltr">'.Html::esc($build->canonicalSha256).'</td></tr>'
            .'<tr><th>الأقسام / الفقرات</th><td>'.count($run->index->sections()).' / '.count($build->book->paragraphs).'</td></tr>'
            .'</tbody></table>';

        $html .= '<h3>الدفعات</h3><table class="counts"><thead><tr><th>الدفعة</th><th>الفترة</th><th>الأحداث</th><th>معتمد</th><th>قديم</th><th>مسودة</th><th>digest</th></tr></thead><tbody>';

        foreach (array_keys($context->batches) as $batch) {
            $events = $data->events[$batch]->events ?? [];
            $statuses = array_map(static fn ($event): ReviewStatus => $context->status($batch, $event->id), $events);
            $html .= '<tr data-batch="'.Html::esc($batch).'"><td>'.Html::esc($batch).'</td><td>'.Html::esc($context->batches[$batch]['period']).'</td><td>'.count($events).'</td>'
                .'<td>'.self::count($statuses, ReviewStatus::Approved).'</td><td>'.self::count($statuses, ReviewStatus::Stale).'</td><td>'.self::count($statuses, ReviewStatus::Draft).'</td>'
                .'<td class="ltr">'.Html::esc(substr($context->digest($batch), 0, 16)).'…</td></tr>';
        }

        $html .= '</tbody></table>';
        $html .= '<p>الأماكن: '.count($data->gazetteer->places ?? []).' · الاستثناءات: '.count($data->exclusions).' · المسارات: '.count($data->routes).' · المحطات: '.count($data->milestones).'</p>';

        $html .= '<h3>نتائج المدقق</h3>';
        $html .= '<p>أخطاء: '.$run->issues->count(Severity::Error).' · تحذيرات: '.$run->issues->count(Severity::Warning).'</p>';
        $html .= '<ul class="issues">';

        foreach ($run->issues->all() as $issue) {
            $html .= '<li class="'.Html::esc($issue->severity->value).'"><span class="ids">['.Html::esc($issue->rule).']</span> '
                .Html::esc($issue->severity->value).' · '.Html::esc($issue->where).': '.Html::esc($issue->message).'</li>';
        }

        return $html.'</ul></section>';
    }

    /**
     * @param  list<ReviewStatus>  $statuses
     */
    private static function count(array $statuses, ReviewStatus $wanted): int
    {
        return count(array_filter($statuses, static fn (ReviewStatus $status): bool => $status === $wanted));
    }
}
