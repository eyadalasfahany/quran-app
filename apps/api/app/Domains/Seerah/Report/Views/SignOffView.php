<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Report\Views;

use App\Domains\Seerah\Report\Html;
use App\Domains\Seerah\Report\ReportContext;

/**
 * View 7: for each group, the record count, the digest the sign-off would carry, and the exact command. The digest is the one
 * seerah:approve writes, so the developer can check that what is signed is what the file says.
 */
final class SignOffView implements ReportView
{
    public function render(ReportContext $context): string
    {
        $html = '<section id="signoff"><h2>7. التوقيع</h2><table><thead><tr><th>المجموعة</th><th>السجلات</th><th>digest</th><th>الأمر</th></tr></thead><tbody>';

        foreach (['G', ...array_keys($context->batches), 'M'] as $group) {
            $count = count($context->recordsOf($group));
            $html .= '<tr><td>'.Html::esc($group).'</td><td>'.$count.'</td><td class="ltr">'.Html::esc($context->digest($group)).'</td>'
                .'<td class="ltr">php artisan seerah:approve '.Html::esc($group).'</td></tr>';
        }

        return $html.'</tbody></table><p>يُشغَّل الأمر بيد المطوّر فقط، بعد قراءة هذا التقرير.</p></section>';
    }
}
