<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Authoring;

/**
 * A seed list of place names of the Hijaz, the Sham and the routes to them, for `seerah:place-candidates`. It is only a list of words to
 * count in the book; a name becomes a place only when the curator adds it to the gazetteer.
 */
final class SeedPlaces
{
    /** @var list<string> */
    public const array NAMES = [
        'مكة', 'المدينة', 'يثرب', 'الطائف', 'بدر', 'أحد', 'الحديبية', 'خيبر', 'حنين', 'تبوك', 'قباء', 'الجحفة',
        'الحبشة', 'الشام', 'بصرى', 'دمشق', 'حراء', 'ثور', 'الكعبة', 'الصفا', 'المروة', 'منى', 'عرفات', 'مزدلفة',
        'الأبطح', 'دار الأرقم', 'شعب أبي طالب', 'الحجون', 'أجياد', 'ذي طوى', 'نخلة', 'عكاظ', 'مجنة', 'ذو المجاز',
    ];

    /**
     * Words after which a place is usually named (normalised by the caller).
     *
     * @var list<string>
     */
    public const array CUE_WORDS = ['إلى', 'من', 'ب'];
}
