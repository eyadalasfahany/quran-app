<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Report;

use App\Domains\Seerah\Report\Views\CoverageView;
use App\Domains\Seerah\Report\Views\FlagsView;
use App\Domains\Seerah\Report\Views\MapCheckView;
use App\Domains\Seerah\Report\Views\OverviewView;
use App\Domains\Seerah\Report\Views\PlacesView;
use App\Domains\Seerah\Report\Views\QuranRunsView;
use App\Domains\Seerah\Report\Views\ReportView;
use App\Domains\Seerah\Report\Views\SignOffView;
use App\Domains\Seerah\Report\Views\UnsetView;
use App\Domains\Seerah\Report\Views\YearView;

/**
 * The review report (data-format.md, «Review report»): one self-contained right-to-left HTML page with inline style and script, no
 * network, no external file. Views 0 and 0b come first; the page is never written back to the data.
 */
final class SeerahReport
{
    private const string STYLE = <<<'CSS'
body{font-family:system-ui,sans-serif;margin:24px;color:#1d1d1f;background:#fff;line-height:1.6}
h2{border-bottom:2px solid #ccc;padding-bottom:4px;margin-top:40px}
table{border-collapse:collapse;width:100%;margin:8px 0}th,td{border:1px solid #ddd;padding:4px 8px;vertical-align:top;text-align:start}
.event{border:1px solid #ccc;border-radius:8px;padding:10px 14px;margin:10px 0}
.event h4{margin:0 0 4px}
.ids{color:#666;font-size:12px}
.ltr{direction:ltr;unicode-bidi:isolate;text-align:start;font-family:ui-monospace,monospace;font-size:12px}
.para{font-size:17px;line-height:2;font-family:"Geeza Pro","Noto Naskh Arabic",serif}
mark{background:#ffe27a;padding:0 2px}
.badge{display:inline-block;border:1px solid #999;border-radius:10px;padding:0 8px;font-size:12px;margin-inline-start:4px}
.badge.flag,.flag{color:#b00020;border-color:#b00020}
.status-approved{color:#0a7d33;border-color:#0a7d33}.status-stale{color:#b35c00;border-color:#b35c00}.status-draft{color:#555}
.issues .error{color:#b00020}.issues .warning{color:#8a6100}
.coverage .uncovered{background:#fde7ea}.coverage .excluded{background:#f1f1f1}
.place{border-inline-start:3px solid #ddd;padding-inline-start:8px;margin:6px 0}
.map{width:100%;max-width:900px;height:auto;border:1px solid #ccc;background:#fafafa}
.map text{font-size:14px;fill:#1d1d1f}.map .dimmed{opacity:.2}
.filters{position:sticky;top:0;background:#fff;padding:6px 0;border-bottom:1px solid #ddd;z-index:1}
@media print{.filters{display:none}body{margin:12mm;font-size:11pt}.event{break-inside:avoid}h2{break-before:page}}
CSS;

    private const string SCRIPT = <<<'JS'
function seerahFilter(select){var value=select.value;document.querySelectorAll('[data-batch]').forEach(function(el){
el.style.display=(value===''||el.dataset.batch===value)?'':'none';});}
JS;

    private function digests(ReportContext $context): string
    {
        $html = '';

        foreach (['G', ...array_keys($context->batches), 'M'] as $group) {
            $html .= '<p class="ids">digest '.Html::esc($group).': <span class="ltr">'.Html::esc($context->digest($group)).'</span></p>';
        }

        return $html;
    }

    /**
     * @return list<ReportView>
     */
    private function views(): array
    {
        return [
            new OverviewView, new UnsetView, new YearView, new PlacesView, new MapCheckView,
            new FlagsView, new CoverageView, new QuranRunsView, new SignOffView,
        ];
    }

    public function render(ReportContext $context): string
    {
        $body = '';

        foreach ($this->views() as $view) {
            $body .= $view->render($context);
        }

        $batches = '<option value="">كل الدفعات</option>';

        foreach (array_keys($context->batches) as $batch) {
            $batches .= '<option value="'.Html::esc($batch).'">'.Html::esc($batch).'</option>';
        }

        return '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">'
            .'<meta name="viewport" content="width=device-width,initial-scale=1">'
            .'<title>'.Html::esc('تقرير مراجعة السيرة — نور اليقين').'</title>'
            .'<style>'.self::STYLE.'</style></head><body>'
            .'<h1>تقرير مراجعة السيرة: نور اليقين</h1>'
            .'<p class="ids">'.Html::esc('ملف محلي لا يُحفظ في المستودع. لا يعدّل البيانات.').'</p>'
            .'<div class="filters"><label>الدفعة <select onchange="seerahFilter(this)">'.$batches.'</select></label></div>'
            .$body
            .'<footer>'.$this->digests($context).'</footer>'
            .'<script>'.self::SCRIPT.'</script></body></html>';
    }
}
